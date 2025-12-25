import { el, formatMoney } from '../utils.js';
import { getDeliveryText } from '../delivery.js';
import { ProductForm } from '../components/product-form.js';
import { getAddonDisplay } from '../addons.js';
import { ProductAPI } from '../services/product-api.js';

const createVideoFacade = (url) => {
  const frame = el('div', { class: 'video-facade' }, [el('div', { class: 'video-play' })]);
  frame.addEventListener('click', () => {
    const iframe = el('iframe', {
      class: 'video-iframe',
      src: url,
      allow: 'autoplay; fullscreen',
      title: 'Preview'
    });
    frame.replaceWith(iframe);
  });
  return frame;
};

export function ProductsView() {
  const wrap = el('div', { class: 'section fade-in' });
  wrap.appendChild(el('h2', { text: 'Products Studio' }));
  wrap.appendChild(el('p', { text: 'Manage product media, pricing, and personalized video presets.' }));

  const form = ProductForm({ onSaved: () => load() });

  const media = el('div', { class: 'media-grid' }, [
    el('div', { class: 'media-card' }, [
      el('strong', { text: 'Upload Media' }),
      el('div', { class: 'media-drop' }, [
        el('div', { text: 'Drop photos or videos here' }),
        el('small', { text: 'Direct R2/Archive upload will be wired in Phase 9.' })
      ])
    ]),
    el('div', { class: 'media-card' }, [
      el('strong', { text: 'Featured Video' }),
      createVideoFacade('https://player.vimeo.com/video/76979871?autoplay=1')
    ]),
    el('div', { class: 'media-card' }, [
      el('strong', { text: 'Gallery Preview' }),
      el('div', { class: 'media-thumb' }),
      el('div', { text: '3 images 1 overlay' })
    ])
  ]);

  const list = el('div', { class: 'grid-2' });
  const fallbackItems = [
    {
      title: 'Birthday Spark',
      price: 2400,
      media: '3 photos, 1 intro video',
      instant: 1,
      delivery_days: 0,
      addons: [
        {
          id: 'extras',
          type: 'checkbox_group',
          label: 'Extras',
          options: [
            { label: 'Name glow', price: 0, delivery: { instant: false, text: '2 Days Delivery' } },
            { label: 'Rush edit', price: 0, delivery: { instant: true, text: '' } }
          ]
        }
      ]
    }
  ];

  const renderList = (items) => {
    list.innerHTML = '';
    items.forEach((item) => {
      const displayAddons = getAddonDisplay(item.addons || []);
      const addons = el('div', { class: 'chips' }, displayAddons.map((addon) => {
        const suffix = addon.deliveryText ? ` ? ${addon.deliveryText}` : '';
        return el('div', { class: 'chip', text: `${addon.label}${suffix}` });
      }));

      list.appendChild(
        el('div', { class: 'card glass' }, [
          el('h3', { text: item.title || item.name }),
          el('p', { text: item.media || 'Media not set' }),
          el('strong', { text: formatMoney(item.price) }),
          el('small', { text: getDeliveryText(item.instant, item.delivery_days ?? item.deliveryDays) }),
          addons
        ])
      );
    });
  };

  const load = async () => {
    const res = await ProductAPI.list();
    const items = res.ok && res.data?.results?.length ? res.data.results : fallbackItems;
    renderList(items);
  };

  wrap.appendChild(form);
  wrap.appendChild(media);
  wrap.appendChild(list);
  load();
  return wrap;
}
