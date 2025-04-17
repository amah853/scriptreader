const fileInput = document.getElementById('file-input');
const viewer = document.getElementById('viewer');
const saveBtn = document.getElementById('save-btn');

let pdfDoc = null;
let pdfBytesOriginal = null;
let notes = [];

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const arrayBuffer = await file.arrayBuffer();
  pdfBytesOriginal = arrayBuffer;

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  pdfDoc = await loadingTask.promise;

  viewer.innerHTML = ''; // clear
  notes = [];

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const scale = 1.5;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport,
    };
    await page.render(renderContext).promise;

    canvas.dataset.page = pageNum;
    canvas.addEventListener('click', (e) => handleAddNote(e, canvas));
    viewer.appendChild(canvas);
  }

  saveBtn.hidden = false;
});

function handleAddNote(e, canvas) {
  const noteText = prompt('Enter note:');
  if (!noteText) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const page = parseInt(canvas.dataset.page);

  const note = {
    page,
    x,
    y,
    text: noteText
  };

  notes.push(note);
  displayNote(note, canvas);
}

function displayNote(note, canvas) {
  const viewerRect = viewer.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();

  const div = document.createElement('div');
  div.className = 'note';
  div.style.left = `${canvasRect.left + note.x}px`;
  div.style.top = `${canvasRect.top + note.y}px`;
  div.innerText = note.text;
  document.body.appendChild(div);
}

saveBtn.addEventListener('click', async () => {
  const pdfDoc = await PDFLib.PDFDocument.load(pdfBytesOriginal);
  const pages = pdfDoc.getPages();

  notes.forEach(note => {
    const page = pages[note.page - 1];
    const { width, height } = page.getSize();
    const scaledX = note.x;
    const scaledY = height - note.y;

    page.drawText(note.text, {
      x: scaledX,
      y: scaledY,
      size: 10,
      color: PDFLib.rgb(0, 0, 0),
      maxWidth: 150,
    });
  });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'annotated_script.pdf';
  link.click();
});
