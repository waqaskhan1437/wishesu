import { getDeliveryText } from '../../delivery/delivery.js';

export const getAddonDisplay = (config) => {
  const items = [];
  (Array.isArray(config) ? config : []).forEach((field) => {
    (field.options || []).forEach((opt) => {
      const delivery = opt.delivery || null;
      const deliveryText = delivery
        ? (delivery.instant ? getDeliveryText(1, 0) : getDeliveryText(0, delivery.days || 0))
        : '';
      items.push({ label: opt.label || field.label || 'Addon', deliveryText });
    });
  });
  return items;
};

