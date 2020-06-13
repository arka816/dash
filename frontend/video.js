var video, shownBar;
var mimeCodec = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'
var sourceBuffer, mediaSource;
var fileList = [], bufferQueue = [], breakPoints = [];
var duration = 0;
var bufferIndex = 0;

function downloadVideo(url){
    return new Promise(resolve => {
        var xhr = new XMLHttpRequest;
        xhr.open('get', url);
        xhr.responseType = 'arraybuffer'
        xhr.onload = function(){
            caches.open("VC").then((cache) => {
                var r = new Response(xhr.response)
                cache.put(url, r);
            });
            resolve(xhr.response);
        }
        xhr.send();
    })
}

function fetchBuffer(url){
    return new Promise(resolve => {
        url = 'http://localhost:3000/file?filepath=' + url;
        caches.open("VC").then((cache) => {
            return cache.match(url);
        }).then((response) => {
            if(response){
                response.arrayBuffer().then((buffer) => {
                    resolve(buffer);
                }).catch(() => {
                    downloadVideo(url).then((buffer) => resolve(buffer));
                })
            }
            else downloadVideo(url).then((buffer) => resolve(buffer));
        });
    })
}


function sourceopen(_){
    console.log("source open called")
    var mediaSource = this;
    var l = mediaSource.sourceBuffers.length;
    if(l === 0) {
        sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);
        sourceBuffer.mode = "sequence"
        sourceBuffer.onupdateend = function(e){
            var sourceBuffer = e.target;
            if (!sourceBuffer.updating && mediaSource.readyState === 'open'){
                //sourceBuffer.timestampOffset = mediaSource.duration;
                //sourceBuffer.appendWindowStart = mediaSource.duration;
                //sourceBuffer.appendWindowEnd = mediaSource.duration + breakPoints[bufferIndex];
                //sourceBuffer.appendBuffer(bufferQueue[bufferIndex]);
                bufferIndex ++;
                mediaSource.endOfStream();
                video.play();
            }
        };
        fetchBuffer(fileList[0]["format"]["filename"]).then(buffer => {
            console.log(buffer);
            sourceBuffer.appendBuffer(buffer);
            sourceBuffer = mediaSource.sourceBuffers[0]
        })
        .then(() => {
            return fetchBuffer(fileList[2]["format"]["filename"])
        })
        .then(buffer => {
            console.log(buffer);
            bufferQueue.push(buffer);
            sourceBuffer.appendBuffer(buffer);
        })
    }
}

function fetchJSON(name){
    var url = "http://localhost:3000/filelist?filename=" + name;
    var xhr = new XMLHttpRequest();
    xhr.open("get", url);
    xhr.responseType="json";

    xhr.onload = function(){
        fileList = JSON.parse(xhr.response)
        fileList.forEach(element => {
            duration += parseFloat(element["format"]["duration"]);
            breakPoints.push(duration)
        });
        console.log(breakPoints);
        if('MediaSource' in window && MediaSource.isTypeSupported(mimeCodec)){
            mediaSource = new MediaSource();
            video = document.getElementById('video');
            video.crossOrigin = "anonymous";
            video.src = URL.createObjectURL(mediaSource);
            mediaSource.addEventListener('sourceopen', sourceopen);
            mediaSource.sourceBuffers.onaddsourcebuffer = () => {console.log("buffer added")}
            mediaSource.sourceBuffers.onremovesourcebuffer = () => {console.log("buffer removed")}
        }
        else{
            console.log("MIME type not supported: ", mimeCodec);
        }
    }
    xhr.send()
}

function startStream(){
    video = document.getElementById('video');
    shownBar = document.getElementById('shownBar')
    video.ontimeupdate = function(){
        shownBar.style.width = (800* video.currentTime / duration).toString() + "px"
        if(breakPoints[0] - video.currentTime < 0.4){
            video.currentTime += 0.5
        }
    }
    var videoName = "sherlock";
    fetchJSON(videoName);
}
