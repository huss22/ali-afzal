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
        const card = document.createElement('div');
        card.className = 'card';
        card.innerText = cardText;
        siteState.timeline.cardsContainer.appendChild(card);
    }
    siteState.timeline.runningAnimation = await animateInfoIn();
}

function renderQuotes() {
    const template = document.getElementById('quote-element');
    for (const quote of siteState.config.quotes) {
        const element = template.content.cloneNode(true);
        element.querySelector('.quote>.bubble>h1').innerText = quote.headline;
        element.querySelector('.quote>.bubble>p').innerText = quote.text;
        element.querySelector('.quote>h1').innerText = quote.author;
        element.querySelector('.quote>p').innerText = quote.authorTitle;

        document.querySelector('.quotes .scrollable').appendChild(element);
    }
}

async function init() {
    siteState.config = await (await fetch('config.json')).json();
    initTimeline();
    renderTimeline();
    renderQuotes();
    document.getElementById('contact-link').href = `mailto:${siteState.config.email}`;
    
}

window.onload = init;