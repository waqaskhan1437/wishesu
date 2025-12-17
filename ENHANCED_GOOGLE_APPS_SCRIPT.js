// WISHVIDEO Order Management - Enhanced Version
// Features: Colorful sheets, auto-formatting, email notifications

const SHEET_NAME = 'WishVideo Orders';
const COLORS = {header: '#4F46E5', pending: '#FEF3C7', processing: '#DBEAFE', delivered: '#D1FAE5', text: '#FFFFFF'};

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const sheet = getOrCreateSheet();
    const eventType = payload.event_type;
    const orderId = payload.order_id;
    
    if (!orderId) return resp(400, 'Missing order_id');
    
    if (eventType === 'order.created') {
      addOrder(sheet, payload);
      emailConfirm(payload);
      return resp(200, 'Created');
    }
    if (eventType === 'order.delivered') {
      updateDelivered(sheet, payload);
      emailDelivered(payload);
      return resp(200, 'Delivered');
    }
    if (eventType === 'order.processing') {
      updateStatus(sheet, orderId, 'Processing');
      return resp(200, 'Updated');
    }
    return resp(400, 'Unknown event');
  } catch (e) {
    return resp(500, e.toString());
  }
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(SHEET_NAME);
  if (!s) {
    s = ss.insertSheet(SHEET_NAME);
    s.getRange(1,1,1,11).setValues([['Order ID','Customer','Email','Phone','Product','Total','Status','Video','Link','Created','Delivered']]);
    s.getRange(1,1,1,11).setBackground(COLORS.header).setFontColor(COLORS.text).setFontWeight('bold');
    s.setFrozenRows(1);
  }
  return s;
}

function findRow(s, id) {
  const d = s.getDataRange().getValues();
  for (let i=1; i<d.length; i++) if (d[i][0] === id) return i+1;
  return -1;
}

function color(s, r, status) {
  const c = status === 'Pending' ? COLORS.pending : status === 'Processing' ? COLORS.processing : COLORS.delivered;
  s.getRange(r,1,1,11).setBackground(c);
}

function addOrder(s, p) {
  if (findRow(s, p.order_id) !== -1) return;
  s.appendRow([p.order_id, p.customer_name, p.customer_email, p.customer_phone, p.product_title, p.order_total, 'Pending', '', '', new Date(), '']);
  color(s, s.getLastRow(), 'Pending');
}

function updateDelivered(s, p) {
  const r = findRow(s, p.order_id);
  if (r === -1) return;
  s.getRange(r,7).setValue('Delivered');
  s.getRange(r,8).setValue(p.video_url);
  s.getRange(r,9).setValue(p.order_detail_url);
  s.getRange(r,11).setValue(new Date());
  color(s, r, 'Delivered');
}

function updateStatus(s, id, status) {
  const r = findRow(s, id);
  if (r !== -1) {s.getRange(r,7).setValue(status); color(s, r, status);}
}

function emailConfirm(p) {
  if (!p.customer_email) return;
  MailApp.sendEmail(p.customer_email, 'Order Confirmation #'+p.order_id, 
    'Hi '+(p.customer_name||'Customer')+',\n\nOrder confirmed!\nID: #'+p.order_id+'\nProduct: '+p.product_title+'\nTotal: '+p.order_total+'\n\nPreparing your order!\n\nWISHVIDEO Team');
}

function emailDelivered(p) {
  if (!p.customer_email) return;
  MailApp.sendEmail(p.customer_email, 'Video Ready! #'+p.order_id,
    'Hi '+(p.customer_name||'Customer')+',\n\nYour '+p.product_title+' is ready!\n\nDownload: '+(p.order_detail_url||p.video_url)+'\n\nEnjoy!\n\nWISHVIDEO Team');
}

function resp(code, msg) {
  return ContentService.createTextOutput(JSON.stringify({code, msg})).setMimeType(ContentService.MimeType.JSON);
}