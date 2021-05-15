function div(className) {
    const e = document.createElement('div');
    e.className = className;
    return e;
}

function fadeAnimation(delay, total, direction) {
    let base = [
        { transform: 'scale(1)', opacity: 1, offset: delay/total},
        { transform: 'scale(.8)', opacity: 0, offset: 1 }
    ];
    let delayKeyframe =  { transform: 'scale(1)', opacity: 1, offset: 0 };
    if (direction === 'in') {
        base.reverse();
        base[0].offset = delay/total;
        base[1].offset = 1;
        delayKeyframe = { transform: 'scale(.8)', opacity: 0, offset: 0 };
    }
    return [
        delayKeyframe,
        ...base
    ];
}

const siteState = {
    config: null,
    timeline: {
        points: null,
        container: null,
        cardsContainer: null,
        contentTitle: null,
        content: null,
        focused: 0,
        runningAnimation: null,
        runningAnimationType: null
    },
};

function moveTimelineTo(i) {
    siteState.timeline.focused = i;
    renderTimeline();
}

function moveTimeline(delta) {
    if (siteState.timeline.focused + delta >= siteState.timeline.points.length) {
        return;
    }
    if (siteState.timeline.focused + delta < 0) {
        return;
    }
    siteState.timeline.focused += delta;
    renderTimeline();
}

function initTimeline() { 
    const cardsContainer = document.querySelector('.info .cards');
    const container = document.querySelector('.timeline .entries');
    const contentTitle = document.querySelector('.info .title');
    const content = document.querySelector('.info .content');
    const data = siteState.config.workHistory;
    const points = [];
    for (let i = 0; i < data.length; i++) {
        const point = document.createElement('div');
        const text = document.createElement('div');
        text.innerText = data[i].company;
        point.appendChild(text);
        point.classList.add('entry');
        point.addEventListener('click', () => moveTimelineTo(i));
        points.push(point);
        container.appendChild(point);
    }
    document.querySelector('#timeline-prev').addEventListener('click', () => moveTimeline(-1));
    document.querySelector('#timeline-next').addEventListener('click', () => moveTimeline(1));
    siteState.timeline = {
        ...siteState.timeline,
        points,
        cardsContainer,
        container,
        contentTitle,
        content,
        data
    };
}

function groupFadeAnimation(elements, direction) {
    const animations = [];
    const animationFinishPromises = [];
    for(let i = 0; i < elements.length; i++) {
        const e = elements[i];
        e.style.opacity = direction === 'out' ? '0' : '1';
        const delay = i*80;
        const total = 80 + delay;
        const keyframes = fadeAnimation(delay, total, direction);
        const animation = e.animate(keyframes, {duration: total, easing: 'ease-out'});
        animations.push(animation);
        animationFinishPromises.push(new Promise(resolve => {
            animation.onfinish = resolve;
        }));
    }
    return {
        cancel: () => animations.map(a => a.cancel()),
        finished: Promise.all(animationFinishPromises)
    };
}

async function animateInfoIn() {
    const cards = Array.from(siteState.timeline.cardsContainer.querySelectorAll('.card'));
    const elems = [...cards, siteState.timeline.contentTitle, siteState.timeline.content];
    siteState.timeline.runningAnimation = groupFadeAnimation(elems, 'in');
    siteState.timeline.runningAnimationType = 'opening';
    await siteState.timeline.runningAnimation.finished;
    siteState.timeline.runningAnimation = null;
    siteState.timeline.runningAnimationType = null;
}

async function animateInfoOut() {
    const cards = Array.from(siteState.timeline.cardsContainer.querySelectorAll('.card'));
    const elems = [...cards, siteState.timeline.contentTitle, siteState.timeline.content];
    siteState.timeline.runningAnimation = groupFadeAnimation(elems, 'out');
    siteState.timeline.runningAnimationType = 'closing';
    await siteState.timeline.runningAnimation.finished;
    siteState.timeline.runningAnimation = null;
}

function fillParagraphs(root, paragraphs) {
    root.innerHTML = '';
    for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i];
        root.appendChild(document.createTextNode(paragraph));
        if (i !== paragraphs.length - 1) {
            root.appendChild(document.createElement('br'));   
        }                
    }
}

async function renderTimeline() {
    const {runningAnimation, runningAnimationType} = siteState.timeline;
    const {points, focused, container} = siteState.timeline;
    if (runningAnimation && runningAnimationType === 'closing') {
        return;
    } else if (runningAnimation && runningAnimationType === 'opening') {
        siteState.timeline.runningAnimation.cancel();
    }
    container.style.transform = `translateX(calc(50% - var(--entry-width) / 2 - var(--entry-width) * ${focused}))`;
    await animateInfoOut();

    for (let i = 0; i < points.length; i++) {
        const item = points[i];
        // Clear all state.
        item.className = 'entry';
        if (i === focused) {
            item.classList.add('active');
        }
    }
    
    const job = siteState.timeline.data[siteState.timeline.focused];
    document.getElementById('timeline-role').innerText = job.role;
    document.getElementById('timeline-company').innerText = job.company;
    document.getElementById('timeline-range').innerText = job.range;
    siteState.timeline.cardsContainer.innerHTML = '';
    for (const cardText of job.cards) {
        const wrapper = document.createElement('div');
        wrapper.className = 'card-wrapper';

        const card = document.createElement('div');
        card.className = 'card';
        card.innerText = cardText;
        wrapper.appendChild(card);
        siteState.timeline.cardsContainer.appendChild(wrapper);
    }
    fillParagraphs(document.getElementById('timeline-description'), job.description);
    const listRoot = document.getElementById('timeline-responsibilities');
    listRoot.innerHTML = '';
    for (const r of job.responsibilities) {
        const li = document.createElement('li');
        li.innerText = r;
        listRoot.appendChild(li);
    }
    siteState.timeline.runningAnimation = await animateInfoIn();
}

function toggleDropdownMenu() {
    siteState.dropdown.classList.toggle('open');
}

function closeDropdownMenu() {
    siteState.dropdown.classList.remove('open');
}

function throwModal(modalId) {
    const root = document.querySelector('.modal');
    const info = siteState.config.modals[modalId];
    if (!info) return;

    root.querySelector('[data-title]').innerText = info.title;
    root.querySelector('[data-description]').innerText = info.description;
    root.querySelector('[data-roles]').innerHTML = '';
    for (const role of info.roles) {
        const chip = document.createElement('div');
        chip.classList.add('chip');
        chip.innerText = role;
        root.querySelector('[data-roles]').appendChild(chip);
    }
    const smallScreen = window.matchMedia('(max-width: 550px)').matches;
    new TradingView.MediumWidget(
        {
        "symbols": [info.symbols],
        "chartOnly": smallScreen,
        "width": "100%",
        "height": "100%",
        "locale": "en",
        "colorTheme": "light",
        "gridLineColor": "#F0F3FA",
        "trendLineColor": "#2196F3",
        "fontColor": "#787B86",
        "underLineColor": "#E3F2FD",
        "isTransparent": false,
        "autosize": true,
        "container_id": "tradingview_b46a1"
    });
    root.classList.add('shown');
    document.body.style.overflow = 'none';
}

function closeModal() {
    const root = document.querySelector('.modal');
    if (!root.classList.contains('shown')) {
        return;
    }
    root.classList.remove('shown');
    document.body.style.overflow = 'scroll';
}

function onBodyClick(e) {
    const path = e.composedPath().map(e => e.id);
    if (!path.includes("menu-button")) {
        closeDropdownMenu();
    }
    if (!path.includes("modal-card") && !path.includes('companies')) {
        closeModal();
    }
}

function initModals() {
    for (const target of document.querySelectorAll('[data-throw-modal]')) {
        target.addEventListener('click', () => {
            throwModal(target.dataset.throwModal);
        });
    }
}

function onKeyPress(e) {
    if (e.key === "Escape") {
        closeModal();
    }
}

function doDataFills() {
    for (const element of document.querySelectorAll('[data-fill]')) {
        const fieldName = element.dataset.fill;
        const data = siteState.config[fieldName];
        if (typeof data !== 'string') {
            fillParagraphs(element, data);
        } else {
            element.innerText = data;
        }
    }

    for (const root of document.querySelectorAll('[data-fill-list]')) {
        root.innerHTML = '';
        const template = document.getElementById(root.dataset.fillTemplate);
        const field = root.dataset.fillList;
        
        for (const data of siteState.config[field]) {
            const element = template.content.cloneNode(true);
            for (const bindingElement of element.querySelectorAll('[data-input]')) {
                if (bindingElement.dataset.inputBind) {
                    const attr = bindingElement.dataset.inputBind;
                    bindingElement.setAttribute(attr, data[bindingElement.dataset.input]);
                } else {
                    bindingElement.innerText = data[bindingElement.dataset.input];   
                }
            }
            root.appendChild(element);
        }

    }
}

async function init() {
    siteState.config = await (await fetch('config.json')).json();
    siteState.dropdown = document.querySelector('nav .dropdown');
    initTimeline();
    await renderTimeline();
    initModals();
    document.getElementById('contact-link').href = `mailto:${siteState.config.email}`;
    document.getElementById('menu-button').addEventListener('click', () => toggleDropdownMenu());
    document.body.style.overflow = 'scroll';
    document.querySelector('.cover').classList.add('hidden');
    document.body.addEventListener('click', onBodyClick);
    document.body.addEventListener('keydown', onKeyPress);
    // Hide projects since we haven't done it yet.
    document.getElementById('projects-section').remove();
    doDataFills();
}

window.onload = init;