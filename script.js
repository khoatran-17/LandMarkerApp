'use strict';

const elements = {
  form: document.querySelector('.form'),
  containerLocations: document.querySelector('.locations'),
  inputIcon: document.querySelector('.form__input--icon'),
  inputName: document.querySelector('.form__input--name'),
  inputDesc: document.querySelector('.form__input--desc'),
  deleteAllBtn: document.querySelector('.controls__clear'),
  deleteMsg: document.querySelector('.deleteMsg'),
  yesBtn: document.querySelector('.deleteMsg__options--yes'),
  noBtn: document.querySelector('.deleteMsg__options--no'),
  sortBtn: document.querySelector('.controls__sort'),
  sidebar: document.querySelector('.sidebar'),
  sidebarBtn: document.querySelector('.sidebar-menu'),
};

class Location {
  constructor(coords, name, desc, icon) {
    this.date = new Date();
    this.id = (Date.now() + '').slice(-10);
    this.coords = coords;
    this.name = name;
    this.desc = desc;
    this.icon = icon;

    this._setDescription();
  }

  _setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    // Type is defined in the child class where the func is called
    this.description = `${this.name} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }
}

class App {
  #map;
  #mapEvent;
  #locations = [];
  #mapMarks = [];

  constructor() {
    // Get data saved from local storage
    this._getLocalStorage();

    // Get the user's position
    this._getPosition();

    // Event Handler for when the user submit the info for the marker
    //_newLocation is called by the event listener so it is not a method call
    // Must manually bind
    elements.form.addEventListener('submit', this._newLocation.bind(this));

    // Event handler for clicking on location fields, to go to marker
    elements.containerLocations.addEventListener('click', this._moveToPopUp.bind(this));

    // Event handler for clicking on the delete button for location
    elements.containerLocations.addEventListener('click', this._deleteLocation.bind(this));

    // Event handler for clicking on the Delete All button
    [elements.deleteAllBtn, elements.noBtn].forEach(
      function (elem) {
        elem.addEventListener('click', this._displayDeleteMsg);
      }.bind(this)
    );

    elements.yesBtn.addEventListener('click', this._deleteAllLocations.bind(this));

    // Event handler for clicking on the the sort options
    elements.sortBtn.addEventListener('click', this._sortLocations.bind(this));

    // Event handler for clicking to show and hide sidebar
    elements.sidebarBtn.addEventListener('click', this._showSidebar);
  }

  _getPosition() {
    if (navigator.geolocation) {
      // The _loadMap func is called by the getCurrentPosition func so it is not a method call
      // This this keyword is undef and need to be bound manually
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        this._loadSampleMap.bind(this)
      );
    }
  }

  _loadMap(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, 13);

    L.tileLayer(
      'https://{s}.tile.jawg.io/jawg-matrix/{z}/{x}/{y}{r}.png?access-token={accessToken}',
      {
        attribution:
          '<a href="http://jawg.io" title="Tiles Courtesy of Jawg Maps" target="_blank">&copy; <b>Jawg</b>Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        minZoom: 0,
        maxZoom: 22,
        subdomains: 'abcd',
        accessToken: 'Tf1KXac7sjOZK6PdACMBcLukbO2wCjli5dtVCffw6O2af81CIv09SENClqswja9s',
      }
    ).addTo(this.#map);

    // Event Handler for when the user click on the map
    // This keyword points to the map object but we want it to point to the class
    this.#map.on('click', this._showForm.bind(this));

    // Render the markers for the data in the local storage
    this.#locations.forEach(
      function (loc) {
        this._renderLocationMarker(loc);
      }.bind(this)
    );
  }

  _loadSampleMap() {
    alert('Location access denied, using sample location instead. \n(Los Angeles)');

    const latitude = 34.04697021261827;
    const longitude = -118.24378967285158;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    // Render the markers for the data in the local storage
    this.#locations.forEach(
      function (loc) {
        this._renderLocationMarker(loc);
      }.bind(this)
    );
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    elements.form.classList.remove('hidden');
    elements.inputName.focus();
  }

  _hideForm() {
    // Clear the input fields
    elements.inputName.value = elements.inputDesc.value = '';

    elements.form.style.display = 'none';
    elements.form.classList.add('hidden');
    setTimeout(function () {
      elements.form.style.display = 'grid';
    }, 1000);
  }

  _newLocation(e) {
    const validInputs = function (...inputs) {
      return inputs.every(function (inp) {
        return inp != '';
      });
    };

    e.preventDefault();

    // Get the input values
    let name, desc;
    name = elements.inputName.value;
    desc = elements.inputDesc.value;

    if (!validInputs(name, desc)) {
      alert('Please enter a name and a description!');
      return;
    }

    const icon = elements.inputIcon.value;
    const { lat, lng } = this.#mapEvent.latlng;

    let location;
    location = new Location([lat, lng], name, desc, icon);

    // Add the location to the location list
    this.#locations.push(location);

    // Render the popup marker
    this._renderLocationMarker(location);

    // Render the location on the list
    this._renderLocation(location);

    // Hide the form after rendering location to list
    this._hideForm();

    // Set local storage to all locations
    this._setLocalStorage();
  }

  _renderLocationMarker(location) {
    const newLocation = L.marker(location.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${location.icon}--popup`,
        })
      )
      .setPopupContent(`${location.description}`)
      .openPopup();

    // Add marker element to the array to keep track of DOM elem
    this.#mapMarks.push(newLocation);
  }

  _renderLocation(location) {
    let locationColor;

    switch (location.icon) {
      case 'Home':
        locationColor = 'red';
        break;
      case 'Work':
        locationColor = 'rgb(255, 196, 0)';
        break;
      case 'Food':
        locationColor = 'rgb(136, 255, 0)';
        break;
      case 'Hotel':
        locationColor = 'rgb(0, 255, 221)';
        break;
      case 'Store':
        locationColor = 'rgb(0, 140, 255)';
        break;
      case 'Bank':
        locationColor = 'rgb(162, 0, 255)';
        break;
      case 'Gym':
        locationColor = 'rgb(255, 123, 0)';
        break;
    }

    let html = `
      <li style="--border-color: ${locationColor}" class="location" data-id="${location.id} ">
        <span style="--border-color: ${locationColor}"></span>
        <span style="--border-color: ${locationColor}"></span>
        <span style="--border-color: ${locationColor}"></span>
        <span style="--border-color: ${locationColor}"></span>

        <img src="img/icons8-${location.icon}-100.png" class="location__icon" alt="">

        <div class="location__infos">        
          <h2 class="location__name">${location.name}</h2>
          <h3 class="location__desc">${location.desc}</h3>
        </div>

        <i class='bx bx-x location__delete'></i>

      </li>
        `;

    elements.form.insertAdjacentHTML('afterend', html);
  }

  _getLocation(e) {
    // Select the parent element of the element clicked
    const locationElem = e.target.closest('.location');

    // Guard condition
    if (!locationElem) return;

    // Find the matching id in the locations list
    const location = this.#locations.find(function (loc) {
      return parseInt(loc.id) === parseInt(locationElem.dataset.id);
    });

    return [locationElem, location];
  }

  _moveToPopUp(e) {
    // Get the location clicked by the user, return an array of [DOM elem, location]
    const location = this._getLocation(e);

    if (location) {
      // Leaflet method to change the map view
      this.#map.setView(location[1].coords, 13, {
        animate: true,
        pan: {
          duration: 1,
        },
      });
    }
  }

  _setLocalStorage() {
    localStorage.setItem('locations', JSON.stringify(this.#locations));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('locations'));

    if (!data) return;

    this.#locations = data;

    this.#locations.forEach(
      function (loc) {
        this._renderLocation(loc);
      }.bind(this)
    );
  }

  _deleteLocation(e) {
    // Get the location clicked by the user, return an array of [DOM elem, location]
    const location = this._getLocation(e);

    if (location) {
      const index = this.#locations.indexOf(location[1]);

      if (e.target.classList.contains('location__delete')) {
        location[0].remove();
        this.#locations.splice(index, 1);

        this.#mapMarks[index].remove();
        this.#mapMarks.splice(index, 1);
      }

      this._setLocalStorage();
    }
  }

  _displayDeleteMsg() {
    elements.deleteMsg.classList.toggle('hidden');
  }

  _deleteAllLocations() {
    localStorage.clear();
    this._displayDeleteMsg();

    // Reload the page
    location.reload();
  }

  _sortLocations(e) {
    this.#locations.sort(function (firstLoc, secondLoc) {
      if (firstLoc.icon > secondLoc.icon) return -1;
      return firstLoc.icon < secondLoc.icon ? 1 : 0;
    });

    localStorage.clear();

    this._setLocalStorage();

    location.reload();
  }

  _showSidebar() {
    if (elements.sidebar.style.display === 'none') {
      elements.sidebar.style.display = 'block';
    } else {
      elements.sidebar.style.display = 'none';
    }
  }

  getMarkers() {
    console.log(this.#mapMarks);
  }

  reset() {
    localStorage.removeItem('locations');
    location.reload();
  }
}

const app = new App();
