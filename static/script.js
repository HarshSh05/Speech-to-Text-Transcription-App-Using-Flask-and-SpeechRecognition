let stream; // Global stream variable
const pyaudio = require('pyaudio'); 

$(document).ready(function() {
    $('#recordBtn').click(startRecording);
    $('#stopBtn').click(stopRecording);
    $('#uploadBtn').click(handleFileUpload);
});

console.log("script.js loaded successfully!");

function startRecording() {
    $.ajax({
        url: '/start_recording',  
        method: 'GET',
        success: function() {
            console.log("Recording started (server-side)");
            $('#recordBtn').prop('disabled', true); 
            $('#stopBtn').prop('disabled', false);
            $('#status').text("Recording...").css('visibility', 'visible'); 

            // Initialize and open the PyAudio stream
            stream = pyaudio.open(format=pyaudio.paInt16, channels=1, rate=44100, input=True, frames_per_buffer=1024)
        },
        error: function(error) {
            console.error("Error starting recording:", error);
        }
    });
}

function stopRecording(recordedAudioData) { 
    // Convert recordedAudioData (ArrayBuffer) to Blob
    const blob = new Blob([recordedAudioData], { type: 'audio/wav' }); 

    // Send Blob using FormData
    const formData = new FormData();
    formData.append('audioFile', blob, 'recorded_audio.wav'); 

    $.ajax({
        url: '/stop_recording',  
        method: 'POST', 
        data: formData,
        contentType: false, 
        processData: false,
        success: function(result) { 
            console.log("Recording stopped. Transcription:", result);
            $('#result').text(result); 
            $('#recordBtn').prop('disabled', false); 
            $('#stopBtn').prop('disabled', true);
            translateText(result); // Call the translate function
            $('#status').css('visibility', 'hidden'); 
        },
        error: function(error) {
            console.error("Error stopping recording:", error);
        }
    });
    
}



function translateText(text) {
    $.ajax({
        url: '/translate',
        method: 'POST',
        data: { text: text },
        success: function(translated_text) {
            $('#translation').hide() 
                .text("Translation: " + translated_text)
                .fadeIn(500); 
        },
        error: function(error) {
            console.error("Translation error:", error);
            $('#translation').text("Error: Translation failed.");
        }
    });
}


function handleFileUpload(event) {
    event.preventDefault(); // Prevent potential form submission
    console.log("handleFileUpload triggered by:", event.target); 

    if (event.target.id === 'uploadBtn') { 
        // Logic to get file when triggered by "uploadBtn"
        const fileInput = document.getElementById('audioUpload');
        const file = fileInput.files[0]; 

        // File validation, FileReader, etc. (now inside the block)
        if (!file.type.startsWith('audio/')) {
            alert("Please upload an audio file.");
            return;
        }

        const reader = new FileReader();

        reader.onload = function(e) {
            const audioData = e.target.result;  // Audio data as ArrayBuffer
            sendAudioForTranscription(audioData);  
        };

        reader.readAsArrayBuffer(file); 

    } else {
        // Logic for when triggered directly by file input change
        const file = event.target.files[0]; 

        // If you need similar file validation / handling logic in this case, 
        // you can add it here. 
    }  
}

function sendAudioForTranscription(audioData) {
    console.log("sendAudioForTranscription called!");
    console.log("sendAudioForTranscription called with data:", audioData); // Inspect the data
    // Conversion to a file-like object using Blob
    const blob = new Blob([audioData], { type: 'audio/wav' }); // Choose appropriate audio type
    const file = new File([blob], "audio.wav"); // Example filename

    // FormData for sending the file
    const formData = new FormData();
    formData.append('audioFile', file);
    $('#status').text("Processing...").show();
    $.ajax({
        url: '/upload_audio',  
        method: 'POST',
        data: formData, // Send the FormData object 
        processData: false, // Important for FormData
        contentType: false, // Automatic with FormData
        success: function(result) { 
            console.log("Transcription:", result);
            $('#result').text(result); 
            translateText(result);  
        },
        error: function(error) {
            console.error("Error transcribing uploaded audio:", error);
        },
        success: function(result) { 
            // ... 
            $('#status').hide(); // Hide the status message on success
        },
        error: function(error) {
            // ...
            $('#status').text("Transcription Error").css('color', 'red'); // Error message
        }
    });
}

$('#stopBtn').click(function() {
    // 1. Stop Recording Logic (Using PyAudio or your library)
    stream.stop_stream();
    stream.close();
    audio.terminate(); 

    // 2. Get ArrayBuffer
    const audioData = new Int16Array(frames);  

    // 3. Call stopRecording
    stopRecording(audioData);  
});
