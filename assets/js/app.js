function toggleMenu() {
  var menu = document.querySelector('.menu-list');
  menu.classList.toggle('active');
}

document.addEventListener("DOMContentLoaded", function () {
  const headerContainer = document.querySelector("header .nav-container");
  fetch("../assets/components/navbar.html")
    .then(response => response.text())
    .then(content => {
      headerContainer.insertAdjacentHTML("beforeend", content);
    })
    .catch(error => {
      console.error("Error fetching navbar content:", error);
    });
  const currentYear = new Date().getFullYear();
  const footer = document.querySelector('.copyright');
  footer.textContent = `Copyright © ${currentYear}, LYNC | All Rights Reserved`;
  var lazyImages = document.querySelectorAll("img[loading='lazy']");

  lazyImages.forEach(function (img) {
    img.addEventListener("load", function () {
      img.removeAttribute("loading");
    });
  });
});function setFocus(on) {
  var element = document.activeElement;
  if (on) {
    setTimeout(function () {
      element.parentNode.classList.add("focus");
    });
  } else {
    let box = document.querySelector(".input-box");
    box.classList.remove("focus");
    $("input").each(function () {
      var $input = $(this);
      var $parent = $input.closest(".input-box");
      if ($input.val()) $parent.addClass("focus");
      else $parent.removeClass("focus");
    });
  }
}
// Function to toggle password visibility
document.getElementById("togglePassword").addEventListener('click', function() {
  var passwordField = document.getElementById("password");
  var toggleIcon = document.getElementById("togglePassword");
  
  if (passwordField.type === "password") {
    passwordField.type = "text";
    toggleIcon.textContent = "key_off";
} else {
    passwordField.type = "password";
    toggleIcon.textContent = "password";
}
});// DOM elements
const micButton = document.getElementById('micIcon');
const videoButton = document.getElementById('videoIcon');
const localVideo = document.getElementById('localVideo');
const startButton = document.getElementById('videoIcon');
// Variables to track media stream status
let micEnabled = true;
let videoEnabled = true;
let localStream;

// Function to toggle microphone stream
function toggleMic() {
    if (micEnabled) {
        localStream.getAudioTracks().forEach(track => track.enabled = false);
        micEnabled = false;
        micButton.textContent = 'mic_off';
    } else {
        localStream.getAudioTracks().forEach(track => track.enabled = true);
        micEnabled = true;
        micButton.textContent = 'mic';
    }
}

// Function to toggle camera stream
function toggleVideo() {
    if (!localStream) {
        return;
    }
    if (videoEnabled) {
        localStream.getVideoTracks().forEach(track => track.enabled = false);
        videoEnabled = false;
        videoButton.textContent = 'videocam_off';
    } else {
        localStream.getVideoTracks().forEach(track => track.enabled = true);
        videoEnabled = true;
        videoButton.textContent = 'videocam';
    }
}

// Event listener for mic button
micButton.addEventListener('click', toggleMic);
videoButton.addEventListener('click', toggleVideo);
// Function to start video chat
async function startVideoChat() {
  try {
      const constraints = { video: true, audio: true };
      localStream = await navigator.mediaDevices.getUserMedia(constraints);
      localVideo.srcObject = localStream;
  } catch (error) {
      console.error('Error accessing media devices:', error);
  }
}

// Function to switch between front and rear camera
function switchCamera() {
  if (!localStream) {
      return;
  }
  const videoTracks = localStream.getVideoTracks();
  if (videoTracks.length === 0) {
      console.warn('No video tracks found');
      return;
  }
  const track = videoTracks[0];
  track.stop(); // Stop the current track

  // Get the deviceId of the currently selected camera
  const currentDeviceId = track.getSettings().deviceId;

  // Find the next available camera (front or rear)
  navigator.mediaDevices.enumerateDevices()
      .then(devices => {
          const nextCamera = devices.find(device => {
              return device.kind === 'videoinput' && device.deviceId !== currentDeviceId;
          });
          if (nextCamera) {
              // Create constraints with the new deviceId
              const constraints = {
                  video: {
                      deviceId: { exact: nextCamera.deviceId }
                  },
                  audio: true
              };
              // Get the stream from the new camera
              return navigator.mediaDevices.getUserMedia(constraints);
          } else {
              console.warn('No other video input devices found');
              return Promise.reject('No other video input devices found');
          }
      })
      .then(newStream => {
          localStream = newStream;
          localVideo.srcObject = localStream;
      })
      .catch(error => {
          console.error('Error switching camera:', error);
      });
}
// Event listener for "reverse camera" button
document.getElementById('reverse').addEventListener('click', switchCamera);
// Event listener for start button
document.getElementById('person').addEventListener('click', startVideoChat);
