const MUSIC_FILE = "CHITTIYAAN KALAIYAAN.mp3";
const START_TIME = 23.2;

let audio;
let musicStarted = false;

function getParentAudioHost() {
    try {
        if (window.top !== window && typeof window.top.startMusic === "function") {
            return window.top;
        }
    } catch (error) {
        return null;
    }
    return null;
}

function getAudio() {
    if (!audio) {
        audio = new Audio(MUSIC_FILE);
        audio.loop = true;
        audio.preload = "auto";
        audio.currentTime = START_TIME;
    }
    return audio;
}

function isMusicPlaying() {
    const host = getParentAudioHost();
    if (host && typeof host.isMusicPlaying === "function") {
        return host.isMusicPlaying();
    }

    return Boolean(audio && musicStarted && !audio.paused);
}

function updateMusicButton() {
    const playing = isMusicPlaying();
    const buttons = document.querySelectorAll("#musicControl, [data-music-control]");
    buttons.forEach((button) => {
        button.textContent = playing ? "Mute" : "Music";
        button.classList.toggle("playing", playing);
    });
}

function refreshFramedMusicButton() {
    const frame = document.getElementById("siteFrame");
    try {
        frame?.contentWindow?.updateMusicButton?.();
    } catch (error) {
        return;
    }
}

function startMusic(resetTrack = false) {
    const host = getParentAudioHost();
    if (host) {
        return host.startMusic(resetTrack).finally(updateMusicButton);
    }

    const player = getAudio();
    if (resetTrack) {
        player.currentTime = START_TIME;
    }

    return player.play()
        .then(() => {
            musicStarted = true;
            updateMusicButton();
            refreshFramedMusicButton();
        })
        .catch(() => {
            musicStarted = false;
            updateMusicButton();
            refreshFramedMusicButton();
        });
}

function toggleMusic() {
    const host = getParentAudioHost();
    if (host) {
        host.toggleMusic();
        setTimeout(updateMusicButton, 50);
        return;
    }

    const player = getAudio();
    if (musicStarted && !player.paused) {
        player.pause();
        musicStarted = false;
        updateMusicButton();
        refreshFramedMusicButton();
        return;
    }

    startMusic();
}

function loadPage(page) {
    const frame = document.getElementById("siteFrame");
    if (frame) {
        frame.src = page;
        return;
    }

    window.location.href = page;
}

function enterSite() {
    sessionStorage.setItem("vtuMusicRequested", "yes");

    const gate = document.getElementById("gate");
    const shell = document.getElementById("appShell");
    startMusic(true);

    if (gate && shell) {
        gate.hidden = true;
        shell.hidden = false;
        loadPage("home.html");
        return;
    }

    window.location.href = "home.html";
}

function navigateToCourse(courseType) {
    const pages = {
        "social-networks": "social-networks.html",
        "waste-management": "waste-management.html"
    };

    if (!pages[courseType]) return;

    const host = getParentAudioHost();
    if (host && typeof host.loadPage === "function") {
        host.loadPage(pages[courseType]);
        return;
    }

    loadPage(pages[courseType]);
}

async function getCodePayload(filename) {
    const response = await fetch(filename, { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`Could not load ${filename}`);
    }
    return response.text();
}

async function writeClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.top = "-1000px";
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    textArea.remove();
}

function showNotification(message) {
    const notification = document.getElementById("notification");
    if (!notification) return;

    notification.textContent = message;
    notification.classList.add("show");
    clearTimeout(showNotification.timer);
    showNotification.timer = setTimeout(() => {
        notification.classList.remove("show");
    }, 3000);
}

async function copyCode(filename, trigger) {
    const button = trigger?.closest ? trigger.closest(".copy-button") : trigger;
    const originalText = button ? button.textContent : "";

    try {
        const code = await getCodePayload(filename);
        await writeClipboard(code);

        showNotification("Code copied successfully.");
        if (button) {
            button.textContent = "Copied";
            button.classList.add("copied");
            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove("copied");
            }, 2500);
        }
    } catch (error) {
        console.error("Failed to copy code:", error);
        showNotification(`Could not fetch ${filename}. Run the site through a local server.`);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    sessionStorage.removeItem("vtuMusicTime");

    if (getParentAudioHost()) {
        document.body.classList.add("framed-page");
    } else if (document.getElementById("siteFrame")) {
        getAudio().load();
    }

    updateMusicButton();

    const frame = document.getElementById("siteFrame");
    if (frame) {
        frame.addEventListener("load", refreshFramedMusicButton);
    }

    if (sessionStorage.getItem("vtuMusicRequested") === "yes") {
        if (!getParentAudioHost() && !document.getElementById("siteFrame")) {
            startMusic();
        }

        document.addEventListener("click", () => {
            if (!isMusicPlaying()) startMusic();
        }, { once: true });
    }
});
