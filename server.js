import express from 'express';
import WebTorrent from 'webtorrent';
import cors from 'cors';
import pump from 'pump';

async function setupServer() {
    const app = express();
    const client = new WebTorrent();

    app.use(cors());
    app.use(express.json());


    const findVideoFile = (files) => {
        // Check for .mkv or .mp4 files
        return files.find(file => file.name.endsWith('.mkv') || file.name.endsWith('.mp4'));
    };

    const findSubtitleFile = (files) => {
        // Check for common subtitle file extensions
        return files.find(file => file.name.endsWith('.srt') || file.name.endsWith('.vtt'));
    };

    app.post('/add-torrent', async (req, res) => {
        const { torrentId } = req.body;


        const existingTorrent = await client.get(torrentId);





        if (existingTorrent) {
            const file = findVideoFile(existingTorrent.files);
            if (file) {
                res.json({ url: `http://localhost:3001/stream/${encodeURIComponent(torrentId)}` });
            } else {
                res.status(404).send('Видеофайл не найден');
            }
        } else {
            client.add(torrentId, torrent => {
                const file = findVideoFile(torrent.files);
                if (file) {
                    res.json({ url: `http://localhost:3001/stream/${encodeURIComponent(torrentId)}` });

                } else {
                    res.status(404).send('Видеофайл не найден');
                }
            });
        }
    });


    app.get('/stream/:torrentId', async (req, res) => {
        const torrentId = decodeURIComponent(req.params.torrentId);
        const torrent = await client.get(torrentId);

        if (torrent && torrent.files.length) {
            const file = findVideoFile(torrent.files);
            if (file) {
                const range = req.headers.range;
                const videoSize = file.length;
                if (range) {
                    const parts = range.replace(/bytes=/, "").split("-");
                    const start = parseInt(parts[0], 10);
                    const end = parts[1] ? parseInt(parts[1], 10) : videoSize - 1;
                    const chunksize = (end - start) + 1;
                    const fileStream = file.createReadStream({ start, end });
                    res.writeHead(206, {
                        "Content-Range": `bytes ${start}-${end}/${videoSize}`,
                        "Accept-Ranges": "bytes",
                        "Content-Length": chunksize,
                        "Content-Type": `video/${file.name.endsWith('.mp4') ? 'mp4' : 'x-matroska'}`,
                    });
                    pump(fileStream, res);
                } else {
                    res.writeHead(200, {
                        'Content-Length': videoSize,
                        'Content-Type': `video/${file.name.endsWith('.mp4') ? 'mp4' : 'x-matroska'}`
                    });
                    pump(file.createReadStream(), res);
                }
            } else {
                res.status(404).send('Видеофайл не найден');
            }
        } else {
            res.status(404).send('Торрент не найден');
        }
    });


    app.get('/subtitle/:torrentId', async (req, res) => {
        const torrentId = decodeURIComponent(req.params.torrentId);
        const torrent = await client.get(torrentId);

        if (torrent && torrent.files.length) {
            const file = findSubtitleFile(torrent.files);
            if (file) {
                const subtitleStream = file.createReadStream();
                res.writeHead(200, {
                    "Content-Type": "text/vtt", // or the appropriate MIME type for your subtitle format
                });
                pump(subtitleStream, res);
            } else {
                res.status(404).send('Subtitle file not found');
            }
        } else {
            res.status(404).send('Torrent not found');
        }
    });


    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

setupServer().catch(err => console.error(err));



