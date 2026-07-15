from svglib.svglib import svg2rlg
from reportlab.graphics import renderPM

drawing = svg2rlg("frontend/public/davide_logo.svg")
renderPM.drawToFile(drawing, "frontend/public/davide_logo.png", fmt="PNG")
