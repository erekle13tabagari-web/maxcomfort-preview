/* Max Comfort storefront settings. The only file to edit when the site moves to the server.

   mode
     'static'  reads data/catalog.json; orders and requests are not sent anywhere (preview).
     'bitrix'  reads the catalog from api/catalog.php and sends orders and requests to Bitrix
               through api/order.php and api/lead.php (set the webhook in api/config.php).      */
window.MC_CONFIG = {
  mode: 'static',
  api: 'api/',
  catalog: 'data/catalog.json',

  company: 'შპს „მაქსკომფორტი“',
  phone: '0322 152 152',
  phoneHref: 'tel:+995322152152',
  email: 'info@maxcomfort.ge',
  hours: 'ორშ-პარ 10:00-18:00',

  // pickup points (checkout) and the contact page
  showrooms: [
    { id: 'tsereteli', name: 'წერეთლის შოურუმი', address: 'ა. წერეთლის გამზ. 114', phone: '0322 477 555 (321)', email: 'beretta@maxcomfort.ge' },
    { id: 'agladze', name: 'ელიავას შოურუმი #1', address: 'რ. აგლაძის 7ა', phone: '0322 477 555 (313)', email: 'shop@maxcomfort.ge', hq: true },
    { id: 'kosmonavtebi', name: 'ელიავას შოურუმი #2', address: 'კოსმონავტების ქ. 21', phone: '0322 477 555 (312)', email: 'beretta1@maxcomfort.ge' }
  ],

  // delivery options; price null = the manager confirms the cost when calling back
  delivery: [
    { id: 'pickup', name: 'გატანა შოურუმიდან', note: 'მზად იქნება დადასტურებიდან 1 სამუშაო დღეში', price: 0 },
    { id: 'tbilisi', name: 'მიწოდება თბილისში', note: '1-2 სამუშაო დღე', price: null },
    { id: 'regions', name: 'მიწოდება რეგიონებში', note: '2-4 სამუშაო დღე', price: null }
  ],
  payment: [
    { id: 'cash', name: 'ადგილზე გადახდა', note: 'ნაღდი ან ბარათით, მიღებისას' },
    { id: 'invoice', name: 'საბანკო გადარიცხვა', note: 'ინვოისს მოგიგზავნით ელ. ფოსტაზე' },
    { id: 'installment', name: 'განვადება', note: 'პირობებს მენეჯერი შეგითანხმებთ' }
  ],

  /* Sign-in with Google / Facebook / Apple on account.html (public IDs only; secrets go into api/config.php).
     Empty = the button is hidden in 'bitrix' mode; the preview shows all three. The phone number stays
     required: a first provider sign-in asks for it and confirms it by SMS.                                */
  auth: {
    google: '',          // OAuth client ID (Web application), add the site's address to its JavaScript origins
    facebook: '',        // App ID
    apple: '',           // Services ID
    appleRedirect: ''    // '' = this page's address; it must be registered with the Services ID
  },

  social: {
    youtube: 'https://www.youtube.com/channel/UCRv76wLBC73jiP7LX4C3l8Q'
  }
};
