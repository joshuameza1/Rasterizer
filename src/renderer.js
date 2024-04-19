document.addEventListener('DOMContentLoaded', () => {
    const dropArea = document.getElementById('dropArea');

    // Handle dragover event
    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault(); // Prevent default behavior
    });

    // Handle drop event
    dropArea.addEventListener('drop', handleDrop, false);
});

// Function to handle dropped files
async function handleDrop(e) {
    e.preventDefault();
    const dt = e.dataTransfer;
    const files = dt.files;

    // Load XML files
    const maskedSectionsFilePath = '../assets/xml/masked_sections.xml';
    const newCanvasFilePath = '../assets/xml/new_canvas.xml';
    const maskedSectionsXML = await fetchXMLFile(maskedSectionsFilePath);
    const newCanvasXML = await fetchXMLFile(newCanvasFilePath);

    if (!maskedSectionsXML || !newCanvasXML) {
        console.error('Failed to fetch XML files');
        return;
    }

    // Parse XML
    const maskedSections = parseMaskedSectionsXML(maskedSectionsXML);
    const { canvasWidth, canvasHeight, positions } = parseCanvasXML(newCanvasXML);

    if (files.length === 1) {
        // If only one image is dropped, process and download it directly
        processAndDownloadImage(files[0], maskedSections, positions, canvasWidth, canvasHeight);
    } else {
        // If multiple images are dropped, zip them and download the zip file
        processAndDownloadZip(files, maskedSections, positions, canvasWidth, canvasHeight);
    }
}

function processAndDownloadImage(file, maskedSections, positions, canvasWidth, canvasHeight) {
    // Create a new canvas
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    // Load the dropped image
    const img = new Image();
    img.onload = function() {
        // Apply masks based on XML
        maskedSections.forEach((section, index) => {
            ctx.drawImage(img, section.x, section.y, section.width, section.height, positions[index].x, positions[index].y, section.width, section.height);
        });

        // Convert canvas to Blob
        canvas.toBlob(blob => {
            // Create a temporary anchor element
            const a = document.createElement('a');
            document.body.appendChild(a);
            a.style.display = 'none';

            // Create object URL from Blob
            const url = URL.createObjectURL(blob);

            // Set anchor element attributes
            a.href = url;
            a.download = file.name; // Set the download filename
            a.click();

            // Remove the temporary anchor element
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        });
    };
    img.src = URL.createObjectURL(file); // Load the image
}

function processAndDownloadZip(files, maskedSections, positions, canvasWidth, canvasHeight) {
    // Create a JSZip instance
    const zip = new JSZip();

    // Counter to track processed images
    let processedImages = 0;

    // Iterate over each dropped file
    Array.from(files).forEach(async (file, fileIndex) => {
        if (file.type.startsWith('image/')) {
            const img = new Image();
            img.onload = function() {
                // Create a new canvas for each image
                const canvas = document.createElement('canvas');
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;
                const ctx = canvas.getContext('2d');

                // Apply masks based on XML
                maskedSections.forEach((section, index) => {
                    ctx.drawImage(img, section.x, section.y, section.width, section.height, positions[index].x, positions[index].y, section.width, section.height);
                });

                // Convert canvas to Blob
                canvas.toBlob(blob => {
                    // Add image blob to zip file
                    zip.file(`masked_image_${fileIndex}.png`, blob);

                    // Increment processed images counter
                    processedImages++;

                    // Check if all images are processed
                    if (processedImages === files.length) {
                        // Generate the zip file
                        zip.generateAsync({ type: 'blob' }).then(blob => {
                            // Create a temporary anchor element
                            const a = document.createElement('a');
                            document.body.appendChild(a);
                            a.style.display = 'none';

                            // Create object URL from Blob
                            const url = URL.createObjectURL(blob);

                            // Set anchor element attributes
                            a.href = url;
                            a.download = 'masked_images.zip'; // Set the download filename for the zip file

                            // Programmatically trigger the anchor element to initiate download
                            a.click();

                            // Remove the temporary anchor element
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                        });
                    }
                });
            };
            img.src = URL.createObjectURL(file); // Load the image
        }
    });
}

// Function to fetch XML file asynchronously
async function fetchXMLFile(filePath) {
    try {
        const response = await fetch(filePath);
        const xmlString = await response.text();
        return xmlString;
    } catch (error) {
        console.error('Error fetching XML file:', error);
        return null;
    }
}

// Function to parse the XML file and extract masked sections
function parseMaskedSectionsXML(xmlString) {
    const xmlDoc = new DOMParser().parseFromString(xmlString, 'text/xml');
    const sections = Array.from(xmlDoc.getElementsByTagName('section')).map(section => ({
        x: parseInt(section.getElementsByTagName('x')[0].textContent),
        y: parseInt(section.getElementsByTagName('y')[0].textContent),
        width: parseInt(section.getElementsByTagName('width')[0].textContent),
        height: parseInt(section.getElementsByTagName('height')[0].textContent)
    }));
    return sections;
}

// Function to parse the XML file and extract canvas dimensions and masked sections positions
function parseCanvasXML(xmlString) {
    // Parse the XML string
    const xmlDoc = new DOMParser().parseFromString(xmlString, 'text/xml');

    // Extract canvas dimensions
    const canvas = xmlDoc.getElementsByTagName('canvas')[0];
    const canvasWidth = parseInt(canvas.getElementsByTagName('width')[0].textContent);
    const canvasHeight = parseInt(canvas.getElementsByTagName('height')[0].textContent);

    // Extract masked sections positions
    const positions = Array.from(canvas.getElementsByTagName('section')).map(section => ({
        x: parseInt(section.getElementsByTagName('x')[0].textContent),
        y: parseInt(section.getElementsByTagName('y')[0].textContent)
    }));

    return { canvasWidth, canvasHeight, positions };
}
