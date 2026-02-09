const JimpPkg = require('jimp');
const Jimp = JimpPkg.Jimp || JimpPkg;
const fs = require('fs');

async function processImage(inputPath, outputPath) {
    try {
        console.log(`Reading image from: ${inputPath}`);
        const image = await Jimp.read(inputPath);

        console.log(`Original size: ${image.bitmap.width}x${image.bitmap.height}`);

        // Resize to 200x200 as requested
        console.log('Resizing to 200x200...');
        try {
            // Try object syntax first for Jimp v1
            image.resize({ w: 200, h: 200 });
        } catch (resizeErr) {
            console.log('Resize object syntax failed, trying arguments:', resizeErr.message);
            try {
                image.resize(200, 200);
            } catch (resizeErr2) {
                console.log('Resize arguments failed too:', resizeErr2.message);
                throw resizeErr; // Throw original error
            }
        }

        const width = image.bitmap.width;
        const height = image.bitmap.height;
        console.log(`New size: ${width}x${height}`);

        // Get background color from top-left
        const bgInt = image.getPixelColor(0, 0);
        // Manual intToRGBA (Jimp uses 0xRRGGBBAA)
        const bg = {
            r: (bgInt >> 24) & 0xFF,
            g: (bgInt >> 16) & 0xFF,
            b: (bgInt >> 8) & 0xFF,
            a: bgInt & 0xFF
        };
        console.log(`Background Color detected: RGBA(${bg.r},${bg.g},${bg.b},${bg.a})`);

        const threshold = 40; // Tolerance for color distance

        image.scan(0, 0, width, height, function (x, y, idx) {
            const r = this.bitmap.data[idx + 0];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];

            const dist = Math.sqrt(
                Math.pow(r - bg.r, 2) +
                Math.pow(g - bg.g, 2) +
                Math.pow(b - bg.b, 2)
            );

            // If close to background color, make transparent
            if (dist < threshold) {
                this.bitmap.data[idx + 3] = 0;
            }
        });

        console.log('Processing complete, saving...');

        // Save logic
        if (typeof image.writeAsync === 'function') {
            await image.writeAsync(outputPath);
        } else if (typeof image.write === 'function') {
            await new Promise((resolve, reject) => {
                image.write(outputPath, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        } else {
            console.log('No write method found on image object.');
            // Try to dump keys?
            // console.log(Object.keys(image));
            // const mime = Jimp.MIME_PNG || "image/png";
            // const buffer = await image.getBufferAsync(mime);
            // fs.writeFileSync(outputPath, buffer);
        }

        console.log(`Saved to: ${outputPath}`);
    } catch (error) {
        console.log('Error processing image:', error.message);
        if (error.stack) console.log(error.stack);
        process.exit(1);
    }
}

const args = process.argv.slice(2);
if (args.length < 2) {
    console.error('Usage: node remove-bg.cjs <input> <output>');
    process.exit(1);
}

processImage(args[0], args[1]);
