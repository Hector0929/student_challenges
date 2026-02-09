const Jimp = require('jimp');

async function removeGrid(inputPath, outputPath) {
    try {
        console.log(`Reading image from: ${inputPath}`);
        const image = await Jimp.read(inputPath);
        const width = image.bitmap.width;
        const height = image.bitmap.height;

        // Get reference background color from top-left (0,0)
        // Jimp pixel format: 0xRRGGBBAA
        const refColorInt = image.getPixelColor(0, 0);
        const refColor = Jimp.intToRGBA(refColorInt);

        // Find secondary background color (for checkerboard)
        let refColor2 = null;
        let refColor2Int = null;

        // Scan top row to find a significantly different color
        for (let x = 0; x < Math.min(width, 50); x++) {
            const cInt = image.getPixelColor(x, 0);
            const c = Jimp.intToRGBA(cInt);
            // Simple distance check
            const dist = Math.sqrt(
                Math.pow(c.r - refColor.r, 2) +
                Math.pow(c.g - refColor.g, 2) +
                Math.pow(c.b - refColor.b, 2)
            );
            if (dist > 30) { // Found second color
                refColor2 = c;
                refColor2Int = cInt;
                console.log(`Found secondary background color at x=${x}`);
                break;
            }
        }

        console.log(`Background Color 1: RGBA(${refColor.r},${refColor.g},${refColor.b},${refColor.a})`);
        if (refColor2) console.log(`Background Color 2: RGBA(${refColor2.r},${refColor2.g},${refColor2.b},${refColor2.a})`);

        const threshold = 30; // Tolerance for color matching

        // Scan all pixels
        image.scan(0, 0, width, height, function (x, y, idx) {
            const r = this.bitmap.data[idx + 0];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];
            const a = this.bitmap.data[idx + 3];

            // Check distance to color 1
            const dist1 = Math.sqrt(
                Math.pow(r - refColor.r, 2) +
                Math.pow(g - refColor.g, 2) +
                Math.pow(b - refColor.b, 2)
            );

            let isBackground = dist1 < threshold;

            // Check distance to color 2 (if exists)
            if (!isBackground && refColor2) {
                const dist2 = Math.sqrt(
                    Math.pow(r - refColor2.r, 2) +
                    Math.pow(g - refColor2.g, 2) +
                    Math.pow(b - refColor2.b, 2)
                );
                if (dist2 < threshold) isBackground = true;
            }

            // If background, set alpha to 0
            if (isBackground) {
                this.bitmap.data[idx + 3] = 0;
            }
        });

        await image.writeAsync(outputPath);
        console.log(`Successfully saved transparent image to: ${outputPath}`);
    } catch (error) {
        console.error('Error processing image:', error);
        process.exit(1);
    }
}

// Run
removeGrid(
    '/Users/hectorliu/projects/student_challenges/public/images/tower-v2/player.png',
    '/Users/hectorliu/projects/student_challenges/public/images/tower-v2/player.png' // Overwrite directly
);
