const fs = require('fs');
const express = require('express');
const bodyparser = require('body-parser')
const formidable = require('formidable')
const {execFile} = require('child_process')
const path = require('path')
const ffmpeg = require('fluent-ffmpeg');

const app = express();
app.use(bodyparser.urlencoded({extended: false}))
app.use(bodyparser.json());

const basePath = "D:/videos/"

app.get("/filelist", (req, res) => {
    filename = req.query.filename;
    fs.readFile(path.join(basePath, filename + ".json"), 'utf-8', (err, data) => {
        if(err) throw err;
        data = data.trim();
        data = data.substring(0, data.length - 1)
        data = "[" + data + "]"
        res.write(JSON.stringify(data))
        res.send()
    })
})

app.get("/file", (req, res) => {
    var filepath = req.query.filepath;
    console.log(filepath)
    try{
        if(fs.existsSync(filepath)){
            var stream = fs.createReadStream(filepath);
            var stat = fs.statSync(filepath);
            res.writeHead(200, {
                'Content-Type': 'video/mp4',
                'Content-Length': stat.size
            })
            stream.pipe(res)
        }
    }
    catch(err){
        if(err) throw err;
        res.send("no such file")
    }
})

app.post("/upload", (req, res) => {
    var title;
    var form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
        if(err) throw err;
        title = fields.title;
        var oldpath = files.video.path;
        var newpath = path.join(basePath, title+".mp4");
        fs.readFile(oldpath, function (err, data) {
            if (err) throw err;
            fs.writeFile(newpath, data, function (err) {
                if (err) throw err;
                res.write('File uploaded and moved', (err) => {res.end()});
                fs.open(path.join(path.dirname(newpath), title + ".json"), 'w', (err, file) => {
                    if(err) throw err;
                    console.log("json file created");
                    processFile(newpath, title)
                })
            });
            fs.unlink(oldpath, function (err) {if (err) throw err;});
        });
    })
})

deleteFiles = (title) => {
    console.log("deletefiles called")
    fs.readdir(basePath, (err, files) => {
        console.log(files);
        files.forEach(file => {
            if(file.search('dashinit') === -1 && path.extname(file) !== ".json"){
                if(fs.existsSync(path.join(basePath, file))){
                    fs.unlink(path.join(basePath, file), (err) => {if(err) throw err});
                }
            }
            else if(path.extname(file) !== ".json"){
                ffmpeg.ffprobe(path.join(basePath, file), (err, metadata) => {
                    fs.appendFile(path.join(basePath, title + ".json"), JSON.stringify(metadata) + ", \n", (err) => {if(err) throw err;})
                });
            }
        });
    })
}

processFile = (newpath, title) => {
    execFile('MP4Box', ['-split', '30', path.basename(newpath)], {cwd: basePath}, (err, stdout, stderr) => {
        if(err) throw err;
        fs.readdir(basePath, (err, files) => {
            if(err) throw err;
            files.forEach(file => {
                if(file !== path.basename(newpath) && path.extname(file) === ".mp4" && file.search('dashinit') === -1){
                    execFile("MP4Box", ['-frag', '10000', '-dash', '30000', file], {cwd: basePath}, (err, stdout, stderr) => {
                        if(err) throw err;
                    })
                }
            });
            setTimeout(deleteFiles, 10000, title)
        });
    })
}

var PORT = 3000 | process.env.PORT;
app.listen(PORT, () => {
    console.log("listening to: ", PORT);
})