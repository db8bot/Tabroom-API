/* eslint no-unused-vars: "off", no-undef: "off", no-new: "off" */
import { loadJitsi } from './jitsi.js';
import './mui.js';
import './dropzone.min.js';
import { setupTimer, setupPrepTimers } from './timer.js';

export const checkDOMLoaded = () => {
    // Load Jitsi Video Iframe
    document.addEventListener('DOMContentLoaded', () => {
        loadJitsi(window.jitsiNSDAData);
    });
};

export const formSubmitAction = (disabledTime = 10000) => {
    const contactForm = document.forms.contactForm;
    const issueType = contactForm.querySelector('#issueType');
    const issueDescription = contactForm.querySelector('#issueDescription');

    window.open(
        `mailto:${window.jitsiNSDAData.supportEmail}?subject=[${encodeURIComponent(window.jitsiNSDAData.roomName)}]%20${encodeURIComponent(issueType.value)}&body=${encodeURIComponent(issueDescription.value)}`,
        '_blank',
    );
    issueType.selectedIndex = 0;
    issueDescription.value = '';
    issueDescription.className = 'mui--is-empty mui--is-untouched mui--is-pristine';

    const contactSubmit = document.getElementsByName('contactSubmit')[0];
    contactSubmit.disabled = true;
    setTimeout(() => (contactSubmit.disabled = false), disabledTime);
};

export const supportEmailAction = () => window.open(
    `mailto:${window.jitsiNSDAData.supportEmail}`,
    '_blank',
);

export const setupContact = () => {
    document.getElementById('contactForm').addEventListener('submit', event => {
        event.preventDefault();
        formSubmitAction();
    });

    document.getElementById('supportEmail').addEventListener('click', event => {
        event.preventDefault();
        supportEmailAction();
    });
};

export const createWarningBanner = message => {
    document.body.insertAdjacentHTML('beforebegin',
        `
        <div id="alert" class="alert-div" onClick="this.remove()">
            <div class="alert">
                ${message}
            </div>
        </div>
        `
    )
}

export const downloadFile = async (downloadPath, fileName) =>
    fetch(downloadPath)
        .then(res => {
            if (!res.ok) throw res;
            else { return res; }
        })
        .then(data => data.blob())
        .then(blob => {
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = `${fileName}`;
            link.click();
        })
        .catch(res => {
            try { res.text().then(createWarningBanner); }
            catch (err) { createWarningBanner('Unspecified Error'); }
        });


export const getFiles = async () => {
    // Disable the refresh button while we fetch to slow down requests
    const btn = document.getElementById('refresh');
    btn.disabled = true;

    // Get the list of files in the room
    let files = [];
    try {
        const response = await fetch(`${window.PROXY_PATH ? `/${PROXY_PATH}` : ''}/files?json=${window.REQ_JSON}`);
        if (response.status === 200) {
            files = await response.json();
        }
    } catch (err) {
        console.log(err);
    }

    // Display the list of files
    const ul = document.getElementById('files');
    ul.innerHTML = '';
    if (files.length < 1) {
        ul.insertAdjacentHTML('beforeend', '<li>No files found...</li>');
    } else {
        files.forEach(f => {
            const downloadPath = window.PROXY_PATH ?
                `/${window.PROXY_PATH}/download?file=${f}&json=${window.REQ_JSON}`
            :
                `download?file=${f}&json=${window.REQ_JSON}`;

            const fileButton = document.createElement('button');
            fileButton.type = 'button';
            fileButton.innerText = f;
            fileButton.addEventListener('click', async event => {
                // Buttons are not affected by CSS :visited pseudo-selector
                // Therefore we need to change the color programatically
                event.target.style.color = '#551A8B';
                await downloadFile(downloadPath, f);
            });

            const li = document.createElement('li');
            li.insertAdjacentElement('beforeend', fileButton);
            ul.insertAdjacentElement('beforeend', li);
        });
    }

    btn.disabled = false;
}

export const setupFileShare = () => {
    // Tab Corrections
    mui.tabs.activate('tab-info');

    // Manually instantiate dropzone so we can set options
    Dropzone.autoDiscover = false;
    const dz = new Dropzone('#upload', {
        maxFilesize: 10,
        acceptedFiles: '.docx,.doc,.pdf,.rtf,.txt,.odt',
        dictDefaultMessage: 'Drop files or click here to upload (10MB limit, documents only)',
        init: function() {
            // Get updated file list and clear interface after 5 seconds
            this.on('complete', (file) => { getFiles(); setTimeout(() => { this.removeAllFiles(); }, 5000)});
        },
    });

    // Get the list of files on first page load
    getFiles();

    // Refresh files button
    document.getElementById('refresh').addEventListener('click', async (event) => {
        getFiles();
    });
};

export const setupPage = () => {
    checkDOMLoaded();
    if (window.INIT) {
        if (window.WARNING_BANNER) createWarningBanner(window.WARNING_MESSAGE);
        if (window.CONTACT) setupContact();
        if (window.TIMER) setupTimer();
        setupPrepTimers();
        if (window.FILE_SHARE) setupFileShare();
    }
};

setupPage();
