import threading
import os
import io
import pyaudio
import wave
from flask import Flask, render_template, request, send_from_directory
import speech_recognition as sr
from google.cloud import translate_v2 as translate
from flask import request
from flask import current_app


frames = []

audio = pyaudio.PyAudio()

class SharedData:
    def __init__(self):
        self.recording = False

shared_data = SharedData()  # Create a shared data object

app = Flask(__name__)

@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path, cache_timeout=0)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/transcribe', methods=['POST'])
def transcribe():
    if 'audioFile' not in request.files:
        print("No audio file in the request")
        return "No audio file in the request", 400

    audio_file = request.files['audioFile']
    audio_data = audio_file.read()
    print("Audio data received, length:", len(audio_data))

    try:
        transcription_result = transcribe_audio_data(audio_data)
        return transcription_result
    except Exception as e:  # Catch potential errors
        print(f"Transcription error: {e}")
        return "Error: Transcription failed.", 500
 

@app.route('/start_recording', methods=['GET'])
def start_recording():
    global stream

    shared_data.recording = True  

    def read_audio():
        global stream   # Access stream inside the function
        while shared_data.recording:  
            try:
                data = stream.read(1024, exception_on_overflow=False)
                frames.append(data)
            except Exception as e:
                print(f"Error during recording: {e}")

    stream = audio.open(format=pyaudio.paInt16, channels=1, rate=44100, input=True, frames_per_buffer=1024)
    print("Recording Started")
    audio_thread = threading.Thread(target=read_audio)
    audio_thread.start()  

    return "Recording Started & Saved as WAV (with timeout)" 


@app.route('/stop_recording', methods=['GET'])
def stop_recording():
    shared_data.recording = False 
    print("Stop recording function called")

    # Save to WAV file here

    if 'audioFile' not in request.files:
        return 'No audio file in the request', 400

    audio_file = request.files['audioFile']
    audio_data = audio_file.stream.read()  # Read the data from the file

    try:
        stream.stop_stream()
        stream.close()
        audio.terminate()

        with wave.open('output.wav', 'wb') as wf:
            wf.setnchannels(1)  # Assuming mono audio
            wf.setsampwidth(audio.get_sample_size(pyaudio.paInt16))
            wf.setframerate(44100)
            wf.writeframes(b''.join(frames))

    except Exception as e:
        print(f"Error saving WAV file: {e}")

    transcribed_text = transcribe() 
    return transcribed_text 


@app.route('/upload_audio', methods=['POST'])
def upload_audio():
    if 'audioFile' not in request.files:
        current_app.logger.debug("No 'audioFile' key in request.files")
        return 'No file uploaded', 400

    file = request.files['audioFile']
    # Adding more logging here
    current_app.logger.debug("File Name:", file.filename)  # Use logger
    current_app.logger.debug("Content Type:", file.content_type)
    audio_data = file.stream.read()

    try:
        # Adapt to use audio_data directly if possible
        transcription_result = transcribe_audio_data(audio_data)  

        return transcription_result

    except Exception as e:
        print(f"Transcription error: {e}")
        return "Error: Transcription failed.", 500 
    
def transcribe_audio_data(audio_data):
    print("Received audio data for transcription")

    audio = sr.AudioData(audio_data, sample_rate=44100, sample_width=2) 
    recognizer = sr.Recognizer()

    try:
        text = recognizer.recognize_google(audio)
        print("Transcription result:", text)
        return text
    except sr.UnknownValueError:
        return "Audio could not be understood"
    except sr.RequestError as e:
        return f"Error from Google Speech Recognition; {e}"


@app.route('/translate', methods=['POST']) 
def translate():
    text_to_translate = request.form['text']
    target_language = "hi"  

    # Load your Google Cloud credentials 
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "YOUR_GOOGLE_CLOUD_CREDENTIALS.json"

    # Translation function (Moved outside the route function)
    def translate_text(text, target_language):  
        translate_client = translate.Client()
        translation = translate_client.translate(text, target_language=target_language)
        return translation['translatedText']

    try:
        translated_text = translate_text(text_to_translate, target_language)
        return translated_text
    except Exception as e:
        print(f"Translation error: {e}")
        return "Error: Translation failed." 

if __name__ == '__main__':
    app.run(debug=True)