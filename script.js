'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputTemp = document.querySelector('.form__input--temp');
const inputClimb = document.querySelector('.form__input--climb');
const eyeIcon = document.querySelector('.map__show-all-markers');

class Workout {
    date = new Date ();
    id = Date.now() + ``.slice(-10);
    constructor (coords, distance, duration) {
        this.coords = coords;
        this.distance = distance;
        this.duration = duration;
    }
    _getDescripton () {
        this.description = (this.type === `running` ? `Пробежка ` : `Велотренировка `) + new Intl.DateTimeFormat(`ru-RU`).format(this.date);
    }
}

class Running extends Workout {
    type = `running`;
    constructor (coords, distance, duration, temp) {
        super (coords, distance, duration);
        this.temp = temp;
        this._calculatePace ();
        this._getDescripton ();
    }

    _calculatePace () {
        // min/km
        this.pace = this.duration / this.distance;
    }
}

class Cycling extends Workout {
    type = `cycling`;
    constructor (coords, distance, duration, climb) {
        super (coords, distance, duration);
        this.climb = climb;
        this._calculateSpeed ();
        this._getDescripton ();
    }

    _calculateSpeed () {
        // km/h
        this.speed = this.distance / (this.duration / 60);
    }
}

class App {
    #map;
    #layerGroup = L.featureGroup();
    #mapEvent;
    #workouts = [];

    constructor () {
        // Полученик местоположения пользователя
        this._getGeolocaction()

        // Добавление обработчиков события
        form.addEventListener(`submit`, this._newWorkout.bind(this));
        inputType.addEventListener(`change`, this._toggleClimbField);
        containerWorkouts.addEventListener('click', this._moveToMarker.bind(this));
        containerWorkouts.addEventListener(`click`, this._deleteWorkout.bind(this));
        eyeIcon.addEventListener(`click`, this._showAllMarkers.bind(this));

    }
    _getGeolocaction () {
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                this._loadMap.bind(this), 
                function () {
                    alert(`false`)
                }
            );
        }        
    }
    _loadMap (position) {
        const {latitude} = position.coords;
        const {longitude} = position.coords;
        const coords = [latitude, longitude]
        
        this.#map = L.map('map').setView(coords, 13);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);
        this.#map.on('click', this._showForm.bind(this));
    }
    _showForm (e) {

        this.#mapEvent = e; 

        form.classList.remove(`hidden`)
        inputDistance.focus()
    }
    _hideForm () {
        inputTemp.value = inputClimb.value = inputDistance.value = inputDuration.value = ``;
        form.classList.add(`hidden`)
    }
    _toggleClimbField () {
        inputClimb.closest(`.form__row`).classList.toggle(`form__row--hidden`);
        inputTemp.closest(`.form__row`).classList.toggle(`form__row--hidden`); 
    }
    _newWorkout (e) {
        e.preventDefault();

        const {lat, lng} = this.#mapEvent.latlng;
        let workout;
        const areNumber = (...numbers) => numbers.every(num => Number.isFinite(num));
        const areNumbersPositive = (...numbers) => numbers.every(num => num > 0);

        // Получить данные из формы
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;

        // Если это беговая тренировка 
        if (type === `running`) {
            const temp = +inputTemp.value;  

            // Проверить валидность данных 
            if (!areNumber(distance, duration, temp) || !areNumbersPositive(distance, duration, temp)) 
            return alert(`Заполните все поля положительными числами!`);

            workout = new Running ([lat, lng], distance, duration, temp);
        }

        // Если это велотренировка
        if (type === `cycling`) {
            const climb = +inputClimb.value;    
            // Проверить валидность данных 
            if (!areNumber(distance, duration, climb) || !areNumbersPositive(distance, duration) || climb === 0) 
            return alert(`Заполните все поля положительными числами!`)

            workout = new Cycling ([lat, lng], distance, duration, climb);
        }
        // Добавить новый объект в массив тренировок
        this.#workouts.push(workout);
        
        // Отобразить тренировку на карте
        this._displayWorkout(workout);

        // Отобразить тренировку в списке
        this._displayWorkoutOnSideBar (workout);

        // Очистить поля формы и скрыть форму
        this._hideForm ();
    }
    _displayWorkout (workout) {
        let marker;
        marker = L.marker(workout.coords)
        .addTo(this.#map)
        .bindPopup(
            L.popup({
                maxWidth: 200,
                autoClose: false,
                closeOnClick: false,
                className: `${workout.type}-popup`
            })
        )
        .setPopupContent(`${workout.description}`)
        .openPopup();
        this.#layerGroup.addLayer(marker)
        this.#layerGroup.addTo(this.#map);
        workout.markerId = this.#layerGroup.getLayerId(marker);
    }
    _displayWorkoutOnSideBar (workout) {
        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}" data-markerid="${workout.markerId}">
          <div class="manageWorkout">
            <i class="fa-solid fa-trash-can workout__trash"></i>
          </div>
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? '🏃' : '🚵‍♂️'}</span>
            <span class="workout__value" data-type="running">${workout.distance}</span>
            <span class="workout__unit">км</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value" data-type="duration">${workout.duration}</span>
            <span class="workout__unit">мин</span>
          </div>
        `;

        if (workout.type === `running`) {
            html += `
                    <div class="workout__details">
                    <span class="workout__icon">⏱📏</span>
                    <span class="workout__value">${workout.pace.toFixed(1)}</span>
                    <span class="workout__unit">мин/км</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">👟⏱</span>
                    <span class="workout__value" data-type="temp">${workout.temp}</span>
                    <span class="workout__unit">шаг/мин</span>
                </div>
                </li>
            `;
        }

        if (workout.type === `cycling`) {
            html += `
                    <div class="workout__details">
                    <span class="workout__icon">📏⏱</span>
                    <span class="workout__value">${workout.speed.toFixed(1)}</span>
                    <span class="workout__unit">км/ч</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">🏔</span>
                    <span class="workout__value" data-type="climb">${workout.climb}</span>
                    <span class="workout__unit">м</span>
                </div>
                </li> 
            `;
        }
        form.insertAdjacentHTML(`afterend`, html);
    }

    _moveToMarker (e) {
        const target = e.target.closest(`.workout`);
        if (!target || e.target.closest('.manageWorkout')) return;
        const workout = this.#workouts.find(el => el.id === target.dataset.id)
        this.#map.setView(workout.coords, 13, {duration: 1});
    }

    _addWorkoutToLocalStorage () {
        localStorage.setItem(`workouts`, JSON.stringify(this.#workouts));
        localStorage.setItem(`layerGroup`, JSON.stringify(this.#layerGroup));
    }


    _deleteWorkout (e) {

        const target = e.target.closest(`.workout__trash`);
        if (!target) return;

        const li = e.target.closest(`.workout`);

        this.#layerGroup.getLayer(li.dataset.markerid).remove();
        li.remove();
    }

    _showAllMarkers () {
        if(Object.keys(this.#layerGroup.getBounds()).length == 0) return;
        this.#map.flyToBounds(this.#layerGroup.getBounds(), {duration: 1});
  
    }
}

const app = new App ()


