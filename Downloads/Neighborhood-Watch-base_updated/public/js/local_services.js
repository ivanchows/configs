const serviceQueries = {
  all: 'police stations fire stations hospitals near',
  police: 'police stations near',
  fire: 'fire stations near',
  hospital: 'hospitals emergency room near'
};

const serviceLabels = {
  all: 'Police, fire, and hospitals',
  police: 'Police stations',
  fire: 'Fire stations',
  hospital: 'Hospitals'
};

let currentZip = '';
let currentService = 'all';

function isValidZip(zip) {
  return /^\d{5}$/.test(zip);
}

function buildGoogleMapsEmbedUrl(zip, service) {
  const queryPrefix = serviceQueries[service] || serviceQueries.all;
  const query = encodeURIComponent(queryPrefix + ' ' + zip);
  return 'https://www.google.com/maps?q=' + query + '&output=embed'; //query
}

function setActiveService(service) {
  document.querySelectorAll('[data-service]').forEach((button) => {
    button.classList.toggle('active', button.dataset.service === service);
  });
}

function renderServicesMap(zip, service) {
  const results = document.getElementById('localServicesResults');
  const map = document.getElementById('localServicesMap');
  const heading = document.getElementById('servicesHeading');

  if(!results || !map || !heading) {
    return;
  }

  currentZip = zip;
  currentService = service;
  map.src = buildGoogleMapsEmbedUrl(zip, service);
  heading.textContent = serviceLabels[service] + ' near ' + zip;
  results.hidden = false;
  setActiveService(service);
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function handleLocalServicesSubmit(event) {
  event.preventDefault();

  const zipInput = document.getElementById('serviceZip');
  const error = document.getElementById('serviceZipError');
  const zip = zipInput.value.trim();

  if(!isValidZip(zip)) {
    error.hidden = false;
    document.getElementById('localServicesResults').hidden = true;
    zipInput.focus();
    return;
  }

  error.hidden = true;
  renderServicesMap(zip, 'all');
}

function handleServiceTypeClick(event) {
  const service = event.currentTarget.dataset.service;
  if(!currentZip || !service) {
    return;
  }
  renderServicesMap(currentZip, service);
}

const form = document.getElementById('localServicesForm');
if(form) {
  form.addEventListener('submit', handleLocalServicesSubmit);
}

document.querySelectorAll('[data-service]').forEach((button) => {
  button.addEventListener('click', handleServiceTypeClick);
});
