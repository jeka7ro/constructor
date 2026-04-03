const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUTPUT_PDF = path.join(__dirname, 'PREZENTARE_PONTAJ_DIGITAL_PREMIUM.pdf');

// HTML Template with Navy Blue Theme
const htmlTemplate = `
<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pontaj Digital - Prezentare Premium</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        :root {
            --navy-dark: #0A192F;
            --navy-light: #112240;
            --navy-lighter: #233554;
            --accent-blue: #64FFDA;
            --accent-blue-dim: rgba(100, 255, 218, 0.1);
            --text-main: #CCD6F6;
            --text-secondary: #8892B0;
            --white: #E6F1FF;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background-color: var(--navy-dark);
            color: var(--text-main);
            line-height: 1.6;
            font-size: 16px;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }

        .page {
            width: 210mm; /* A4 width */
            height: 296mm; /* A4 height */
            padding: 20mm;
            position: relative;
            page-break-after: always;
            background-color: var(--navy-dark);
            overflow: hidden;
            border-bottom: 1px solid var(--navy-lighter);
        }
        
        .page:last-child {
            page-break-after: auto;
            border-bottom: none;
        }

        /* Background Graphics */
        .bg-pattern {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            opacity: 0.03;
            background-image: 
                radial-gradient(var(--accent-blue) 1px, transparent 1px),
                radial-gradient(var(--accent-blue) 1px, transparent 1px);
            background-size: 40px 40px;
            background-position: 0 0, 20px 20px;
            z-index: 0;
            pointer-events: none;
        }
        
        .glow {
            position: absolute;
            width: 600px;
            height: 600px;
            background: radial-gradient(circle, rgba(100, 255, 218, 0.05) 0%, transparent 70%);
            border-radius: 50%;
            top: -200px;
            right: -200px;
            z-index: 0;
            pointer-events: none;
        }

        .content-wrapper {
            position: relative;
            z-index: 10;
            height: 100%;
            display: flex;
            flex-direction: column;
        }

        /* Typography */
        h1 {
            color: var(--white);
            font-size: 46px;
            font-weight: 700;
            letter-spacing: -1px;
            margin-bottom: 20px;
            line-height: 1.1;
        }
        
        h2 {
            color: var(--white);
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 30px;
            margin-top: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid var(--navy-lighter);
            display: flex;
            align-items: center;
        }
        
        h2::before {
            content: '';
            display: inline-block;
            width: 4px;
            height: 24px;
            background-color: var(--accent-blue);
            margin-right: 15px;
            border-radius: 2px;
        }

        h3 {
            color: var(--accent-blue);
            font-size: 20px;
            font-weight: 500;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        p {
            margin-bottom: 20px;
            color: var(--text-secondary);
            font-size: 17px;
        }
        
        .lead {
            font-size: 22px;
            color: var(--text-main);
            font-weight: 300;
            margin-bottom: 40px;
            line-height: 1.5;
        }

        .highlight {
            color: var(--accent-blue);
            font-weight: 500;
        }

        /* Components */
        .card {
            background-color: var(--navy-light);
            border: 1px solid var(--navy-lighter);
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 25px;
            box-shadow: 0 10px 30px -15px rgba(2, 12, 27, 0.7);
        }

        ul {
            list-style: none;
            margin-bottom: 20px;
        }

        ul li {
            position: relative;
            padding-left: 25px;
            margin-bottom: 12px;
            color: var(--text-secondary);
        }

        ul li::before {
            content: '▹';
            position: absolute;
            left: 0;
            color: var(--accent-blue);
            font-size: 18px;
            line-height: 1.5;
        }

        .image-container {
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 20px 40px -15px rgba(2, 12, 27, 0.8);
            border: 1px solid var(--navy-lighter);
            margin: 20px 0;
            background-color: var(--navy-light);
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 10px;
        }
        
        .image-container img {
            max-width: 100%;
            height: auto;
            border-radius: 6px;
            display: block;
        }

        .two-columns {
            display: flex;
            gap: 30px;
            margin-top: 30px;
        }

        .col {
            flex: 1;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-box {
            background-color: var(--navy-light);
            padding: 20px;
            border-radius: 8px;
            border-left: 3px solid var(--accent-blue);
        }

        .stat-value {
            font-size: 32px;
            font-weight: 700;
            color: var(--white);
            margin-bottom: 5px;
        }

        .stat-label {
            font-size: 14px;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .footer {
            margin-top: auto;
            padding-top: 20px;
            border-top: 1px solid var(--navy-lighter);
            display: flex;
            justify-content: space-between;
            color: var(--text-secondary);
            font-size: 12px;
        }

        .header-logo {
            font-size: 24px;
            font-weight: 700;
            color: var(--white);
            display: flex;
            align-items: center;
            margin-bottom: 50px;
            letter-spacing: 1px;
        }
        
        .header-logo span {
            color: var(--accent-blue);
            margin-left: 8px;
        }

        .contact-box {
            background-color: var(--accent-blue-dim);
            border: 1px solid var(--accent-blue);
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            margin-top: 40px;
        }

        .contact-box h3 {
            color: var(--white);
            margin-bottom: 10px;
        }
        
        .contact-box p {
            color: var(--accent-blue);
            font-size: 18px;
            margin-bottom: 0;
        }

        /* Mockup containers for screenshots */
        .mockup-mobile {
            width: 280px;
            height: 560px;
            background: #020c1b;
            border-radius: 30px;
            border: 8px solid #333;
            margin: 0 auto;
            overflow: hidden;
            position: relative;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        
        .mockup-mobile img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .mockup-desktop {
            width: 100%;
            background: #020c1b;
            border-radius: 8px;
            border: 2px solid #333;
            border-top: 20px solid #333;
            margin: 0 auto;
            overflow: hidden;
            position: relative;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        
        .mockup-desktop::before {
            content: '';
            position: absolute;
            top: -14px;
            left: 10px;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #ff5f56;
            box-shadow: 15px 0 0 #ffbd2e, 30px 0 0 #27c93f;
        }
        
        .mockup-desktop img {
            width: 100%;
            height: auto;
            display: block;
            object-fit: cover;
        }
    </style>
</head>
<body>

    <!-- PAGE 1: COVER & PROBLEM -->
    <div class="page">
        <div class="bg-pattern"></div>
        <div class="glow"></div>
        <div class="content-wrapper">
            
            <div class="header-logo">
                PONTAJ<span>DIGITAL</span>
            </div>

            <h1>Solutia Completa pentru Managementul Timpului pe Santier</h1>
            <p class="lead">Platforma software care opreste pierderile financiare din "ore moarte" si aduce ordine si trasabilitate totala in echipele de constructii.</p>

            <div class="image-container" style="height: 300px; padding: 0;">
                <img src="https://images.unsplash.com/photo-1541888086425-d81bb19240f5?auto=format&fit=crop&w=1200&q=80" alt="Construction Site" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;" />
            </div>

            <h2>Problema Industriala Curenta</h2>
            
            <div class="card">
                <p>Managementul traditional pe hartie in constructii genereaza pierderi invizibile dar masive. Daca coordonati 50 de muncitori pe 3 santiere diferite, cu siguranta va confruntati cu urmatoarele intrebari zilnice:</p>
                <ul>
                    <li>La ce ora au ajuns <span class="highlight">efectiv</span> la munca angajatii?</li>
                    <li>Cat timp se pierde nejustificat in pauze prelungite?</li>
                    <li>Cati angajati parasesc santierul in timpul programului?</li>
                    <li><span class="highlight">Cati bani pierde compania lunar platind ore neprestate?</span></li>
                </ul>
                <p style="margin-bottom: 0;">Fara un sistem digital validat geografic, condica pe hartie ramane doar o aproximare costisitoare bazata pe incredere oarba.</p>
            </div>

            <div class="footer">
                <div>Prezentare Solutie Enterprise</div>
                <div>Pagina 1</div>
            </div>
        </div>
    </div>

    <!-- PAGE 2: SOLUTION OVERVIEW & MOBILE APPS -->
    <div class="page">
        <div class="bg-pattern"></div>
        <div class="content-wrapper">
            
            <h2>Ecosistemul Pontaj Digital</h2>
            <p>Am dezvoltat o platforma integrata, securizata in cloud, formata din interfete dedicate pentru fiecare rol ierarhic din companie. Simplu in teren, complex si analitic la birou.</p>

            <div class="two-columns" style="align-items: center; margin-top: 40px;">
                <div class="col" style="flex: 1.5;">
                    <h3>01. Nivelul Operativ: Muncitorul</h3>
                    <p>Interfata mobila este conceputa cu o curba de invatare zero. Angajatii nu trebuie sa aiba competente tehnice.</p>
                    <ul>
                        <li><span class="highlight">Flux simplificat:</span> Acces instant, un singur buton masiv pentru pontaj ("Clock In").</li>
                        <li><span class="highlight">Validare Geografica:</span> Sistemul stie automat pe ce santier se afla muncitorul. Pontajul nu este permis in afara ariei santierului.</li>
                        <li><span class="highlight">Transparenta:</span> Muncitorul isi poate verifica propriile ore lucrate, eliminand disputele de la finalul lunii.</li>
                    </ul>
                </div>
                <div class="col" style="display: flex; justify-content: center;">
                    <div class="mockup-mobile">
                        <!-- Placeholder for Worker App Screenshot -->
                        <!--IMG_WORKER_APP-->
                        <div style="background: var(--navy-dark); width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--accent-blue); flex-direction: column; text-align: center; padding: 20px;">
                            <div style="width: 140px; height: 140px; border-radius: 50%; border: 4px solid var(--accent-blue); overflow: hidden; margin-bottom: 20px; box-shadow: 0 0 20px rgba(100, 255, 218, 0.2); position: relative;">
                                <img src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80" alt="Worker Selfie" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
                                <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(10, 25, 47, 0.8); color: var(--white); font-weight: bold; font-size: 14px; padding: 4px 0;">
                                    07:30
                                </div>
                            </div>
                            <h4 style="color: var(--white); margin-bottom: 10px; font-size: 18px;">Santier Rezidential</h4>
                            <div style="background: rgba(100, 255, 218, 0.1); padding: 5px 15px; border-radius: 20px; font-size: 12px; margin-bottom: 30px;">IN PERIMETRU</div>
                            <div style="background: var(--accent-blue); color: var(--navy-dark); width: 100%; padding: 15px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                INCEPE PROGRAMUL
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="two-columns" style="align-items: center; margin-top: 50px;">
                <div class="col" style="display: flex; justify-content: center;">
                    <div class="mockup-mobile">
                        <!-- Placeholder for Team Leader App Screenshot -->
                        <!--IMG_LEADER_APP-->
                        <div style="background: var(--navy-dark); width: 100%; height: 100%; display: flex; align-items: flex-start; flex-direction: column; padding: 20px; border-top: 1px solid var(--navy-lighter);">
                            <h4 style="color: var(--white); margin-bottom: 20px; margin-top: 30px; font-size: 18px; border-bottom: 1px solid var(--navy-lighter); padding-bottom: 10px; width: 100%;">Echipa Zidari (8)</h4>
                            
                            <div style="width: 100%; background: var(--navy-light); padding: 12px; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <div style="width: 10px; height: 10px; border-radius: 50%; background: var(--text-secondary);"></div>
                                    <span style="color: var(--white); font-size: 14px;">Ionescu V.</span>
                                </div>
                                <div style="width: 20px; height: 20px; border-radius: 4px; border: 1px solid var(--text-secondary);"></div>
                            </div>
                            <div style="width: 100%; background: var(--navy-light); padding: 12px; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <div style="width: 10px; height: 10px; border-radius: 50%; background: var(--text-secondary);"></div>
                                    <span style="color: var(--white); font-size: 14px;">Popescu M.</span>
                                </div>
                                <div style="width: 20px; height: 20px; border-radius: 4px; border: 1px solid var(--text-secondary);"></div>
                            </div>
                            <div style="width: 100%; background: var(--navy-light); padding: 12px; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <div style="width: 10px; height: 10px; border-radius: 50%; background: var(--text-secondary);"></div>
                                    <span style="color: var(--white); font-size: 14px;">Dumitru S.</span>
                                </div>
                                <div style="width: 20px; height: 20px; border-radius: 4px; border: 1px solid var(--text-secondary);"></div>
                            </div>
                            
                            <div style="margin-top: auto; width: 100%;">
                                <div style="background: transparent; border: 1px solid var(--accent-blue); color: var(--accent-blue); width: 100%; padding: 12px; border-radius: 8px; font-weight: bold; font-size: 14px; text-align: center; margin-bottom: 10px;">
                                    SELECTEAZA TOTI
                                </div>
                                <div style="background: var(--accent-blue); color: var(--navy-dark); width: 100%; padding: 12px; border-radius: 8px; font-weight: bold; font-size: 14px; text-align: center;">
                                    PONTAJ COLECTIV
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col" style="flex: 1.5;">
                    <h3>02. Controlul in Teren: Seful de Echipa</h3>
                    <p>Am implementat solutii specifice pentru a nu incetini fluxul de lucru in santier. Functiile sefilor de echipa sunt optimizate pentru viteza.</p>
                    <ul>
                        <li><span class="highlight">Pontaj Colectiv (Bulk):</span> Seful alege toti membrii echipei si ii ponteaza simultan printr-o singura actiune. Eficienta maxima, zero timp pierdut.</li>
                        <li><span class="highlight">Gestionarea Pauzelor:</span> Pauzele de masa se pot aplica intregii echipe la nivel centralizat.</li>
                        <li><span class="highlight">Raportare Activitati:</span> La finalul programului, pot introduce cantitatile realizate (ex: mp armatura, mc beton).</li>
                    </ul>
                </div>
            </div>

            <div class="two-columns" style="align-items: center; margin-top: 50px;">
                <div class="col" style="flex: 1.5;">
                    <h3>03. Diriginte / Sef Santier (Control Live pe Harta)</h3>
                    <p>Fiecare responsabil are viziunea de ansamblu pe propriul obiectiv, direct de pe tableta sau telefon.</p>
                    <ul>
                        <li><span class="highlight">Harta Live & Geofence:</span> Vedeti pe harta in timp real daca muncitorii sunt in perimetrul setat.</li>
                        <li><span class="highlight">Alerte Imediate:</span> Daca o persoana iese din raza, iconita devine rosie si pontajul se opreste.</li>
                        <li><span class="highlight">Validare Pontaj:</span> Aprobarea orelor se face digital printr-un simplu swype.</li>
                    </ul>
                </div>
                <div class="col" style="display: flex; justify-content: center;">
                    <div class="mockup-mobile" style="width: 320px; height: 480px; border-radius: 16px;">
                        <div style="background: var(--navy-dark); width: 100%; height: 100%; display: flex; flex-direction: column; position: relative; overflow: hidden;">
                            <div style="padding: 15px; border-bottom: 1px solid var(--navy-lighter); z-index: 10; background: var(--navy-dark);">
                                <h4 style="color: var(--white); font-size: 16px;">Santier Rezidential Nord</h4>
                                <div style="font-size: 12px; color: var(--accent-blue);">42 Muncitori Activi</div>
                            </div>
                            
                            <!-- Mock Map -->
                            <div style="flex: 1; position: relative;">
                                <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=600&q=80" alt="Map View" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.8;" />
                                
                                <!-- Geofence Circle -->
                                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 220px; height: 220px; border-radius: 50%; border: 2px dashed var(--accent-blue); background: var(--accent-blue-dim);"></div>
                                
                                <!-- Pins -->
                                <div style="position: absolute; top: 45%; left: 40%; width: 16px; height: 16px; background: var(--accent-blue); border-radius: 50%; border: 2px solid var(--navy-dark); box-shadow: 0 0 10px var(--accent-blue);"></div>
                                <div style="position: absolute; top: 55%; left: 50%; width: 16px; height: 16px; background: var(--accent-blue); border-radius: 50%; border: 2px solid var(--navy-dark); box-shadow: 0 0 10px var(--accent-blue);"></div>
                                <div style="position: absolute; top: 40%; left: 60%; width: 16px; height: 16px; background: var(--accent-blue); border-radius: 50%; border: 2px solid var(--navy-dark); box-shadow: 0 0 10px var(--accent-blue);"></div>
                                
                                <!-- Out of bounds pin -->
                                <div style="position: absolute; top: 20%; left: 80%; width: 16px; height: 16px; background: #ff5f56; border-radius: 50%; border: 2px solid var(--navy-dark); box-shadow: 0 0 10px #ff5f56;"></div>
                            </div>
                            
                            <!-- Bottom Sheet -->
                            <div style="position: absolute; bottom: 0; left: 0; right: 0; background: var(--navy-light); padding: 15px; border-top-left-radius: 16px; border-top-right-radius: 16px; z-index: 10; box-shadow: 0 -5px 20px rgba(0,0,0,0.5);">
                                <div style="width: 40px; height: 4px; background: var(--text-secondary); border-radius: 2px; margin: 0 auto 15px auto;"></div>
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                    <div style="color: var(--white); font-size: 14px;">Ionescu V.</div>
                                    <div style="color: #ff5f56; font-size: 12px; font-weight: bold;">IN AFARA ZONEI</div>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div style="color: var(--white); font-size: 14px;">Echipa Zidari (8)</div>
                                    <div style="color: var(--accent-blue); font-size: 12px;">ACTIVI</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="footer">
                <div>Prezentare Solutie Enterprise</div>
                <div>Pagina 2</div>
            </div>
        </div>
    </div>

    <!-- PAGE 3: ADMIN PORTAL & SECURITY -->
    <div class="page">
        <div class="bg-pattern"></div>
        <div class="content-wrapper">
            
            <h2>Control si Analiza Financiara (Portal Admin)</h2>
            <p>Pentru Directorii de companie si Project Manageri, platforma ofera un control chirurgical asupra resurselor umane si costurilor, in timp real.</p>
            
            <div class="mockup-desktop" style="margin-bottom: 30px;">
                <!-- Placeholder for Admin Dashboard Screenshot -->
                <!--IMG_ADMIN_APP-->
                <div style="background: var(--navy-dark); width: 100%; height: 350px; display: flex;">
                    <!-- Sidebar -->
                    <div style="width: 200px; background: #0A192F; border-right: 1px solid var(--navy-lighter); padding: 20px;">
                        <div style="color: var(--white); font-weight: bold; font-size: 16px; margin-bottom: 30px;">Admin Portal</div>
                        <div style="background: rgba(100, 255, 218, 0.1); color: var(--accent-blue); padding: 10px; border-radius: 6px; margin-bottom: 10px; font-size: 12px;">Dashboard</div>
                        <div style="color: var(--text-secondary); padding: 10px; margin-bottom: 10px; font-size: 12px;">Utilizatori</div>
                        <div style="color: var(--text-secondary); padding: 10px; margin-bottom: 10px; font-size: 12px;">Santiere</div>
                        <div style="color: var(--text-secondary); padding: 10px; margin-bottom: 10px; font-size: 12px;">Harta Live (GPS)</div>
                        <div style="color: var(--text-secondary); padding: 10px; margin-bottom: 10px; font-size: 12px;">Rapoarte EXCEL</div>
                    </div>
                    <!-- Main Content -->
                    <div style="flex: 1; padding: 20px; background: var(--navy-light);">
                        <h3 style="font-size: 18px; margin-bottom: 20px; color: var(--white);">Overview Santiere LIVE</h3>
                        
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px;">
                            <div style="background: var(--navy-dark); padding: 15px; border-radius: 8px; border: 1px solid var(--navy-lighter);">
                                <div style="font-size: 10px; color: var(--text-secondary);">MUNCITORI ACTIVI</div>
                                <div style="font-size: 24px; color: var(--white); font-weight: bold; margin-top: 5px;">42</div>
                                <div style="font-size: 10px; color: var(--accent-blue); margin-top: 5px;">Pe 3 santiere</div>
                            </div>
                            <div style="background: var(--navy-dark); padding: 15px; border-radius: 8px; border: 1px solid var(--navy-lighter);">
                                <div style="font-size: 10px; color: var(--text-secondary);">IN PAUZA</div>
                                <div style="font-size: 24px; color: var(--white); font-weight: bold; margin-top: 5px;">5</div>
                            </div>
                            <div style="background: var(--navy-dark); padding: 15px; border-radius: 8px; border: 1px solid var(--navy-lighter);">
                                <div style="font-size: 10px; color: var(--text-secondary);">ALERTE GEOFENCE</div>
                                <div style="font-size: 24px; color: #ff5f56; font-weight: bold; margin-top: 5px;">2</div>
                            </div>
                            <div style="background: var(--navy-dark); padding: 15px; border-radius: 8px; border: 1px solid var(--navy-lighter);">
                                <div style="font-size: 10px; color: var(--text-secondary);">ORE AZI</div>
                                <div style="font-size: 24px; color: var(--white); font-weight: bold; margin-top: 5px;">156.5h</div>
                            </div>
                        </div>
                        
                        <div style="display: flex; gap: 15px;">
                            <div style="flex: 2; background: var(--navy-dark); border-radius: 8px; border: 1px solid var(--navy-lighter); height: 160px; padding: 15px; position: relative; overflow: hidden;">
                                <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 10px; position: relative; z-index: 2; background: rgba(10, 25, 47, 0.8); display: inline-block; padding: 2px 5px; border-radius: 4px;">Harta Centralizata (Toate Santierele)</div>
                                <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.6; z-index: 1;" />
                                <!-- Multiple Geofences -->
                                <div style="position: absolute; top: 30%; left: 30%; width: 80px; height: 80px; border-radius: 50%; border: 1px dashed var(--accent-blue); background: rgba(100, 255, 218, 0.2); z-index: 2;"></div>
                                <div style="position: absolute; top: 50%; left: 60%; width: 100px; height: 100px; border-radius: 50%; border: 1px dashed var(--accent-blue); background: rgba(100, 255, 218, 0.2); z-index: 2;"></div>
                            </div>
                            <div style="flex: 1; background: var(--navy-dark); border-radius: 8px; border: 1px solid var(--navy-lighter); height: 160px; padding: 15px;">
                            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 15px;">Alerte Recente</div>
                            <div style="font-size: 11px; color: var(--white); margin-bottom: 10px; display: flex; align-items: center; gap: 5px;">
                                <div style="width: 6px; height: 6px; border-radius: 50%; background: #ff5f56;"></div> Ionescu V. a parasit zona
                            </div>
                            <div style="font-size: 11px; color: var(--white); margin-bottom: 10px; display: flex; align-items: center; gap: 5px;">
                                <div style="width: 6px; height: 6px; border-radius: 50%; background: var(--accent-blue);"></div> Echipa Zidari: Clock in
                            </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="stats-grid">
                <div class="stat-box">
                    <div class="stat-value">Acuratete 100%</div>
                    <div class="stat-label">In Managementul Salarizarii</div>
                    <p style="margin-top: 10px; font-size: 14px; margin-bottom: 0;">Rapoartele se genereaza automat in format compatibil cu programele de contabilitate. Eliminati total munca manuala de reconciliere a pontajelor la final de luna.</p>
                </div>
                <div class="stat-box">
                    <div class="stat-value">Eroare Umana Zero</div>
                    <div class="stat-label">Date Auditate Geospatial</div>
                    <p style="margin-top: 10px; font-size: 14px; margin-bottom: 0;">Fiecare actiune din aplicatie este marcata cu coordonate GPS precise si timestamp inviolabil in baza de date Cloud.</p>
                </div>
            </div>

            <div class="card" style="border-left: 4px solid #ff5f56; margin-top: 20px;">
                <h3 style="color: var(--white);">Tehnologia Geofence: Securitate Totala</h3>
                <p>O problema majora in industrie: angajatii declara ore de munca cand de fapt au parasit zona determinata a santierului.</p>
                <p style="margin-bottom: 0;">Am dezvoltat modulul <span class="highlight">Gard Virtual (Geofence)</span>. Administratorul deseneaza un perimetru pe harta in jurul santierului (ex: raza de 200m). Daca aplicatia muncitorului inregistreaza ca a parasit acest perimetru, <span style="color: #ff5f56; font-weight: bold;">ceasul se opreste automat</span>, pontajul fiind pus in "Pauza", inregistrand doar ora la secunda efectiv petrecuta la lucru.</p>
            </div>

            <div class="footer">
                <div>Prezentare Solutie Enterprise</div>
                <div>Pagina 3</div>
            </div>
        </div>
    </div>

    <!-- PAGE 4: ROI -->
    <div class="page">
        <div class="bg-pattern"></div>
        <div class="glow"></div>
        <div class="content-wrapper">
            
            <h2>Return On Investment (ROI) Garantat</h2>
            
            <div class="image-container" style="height: 250px; padding: 0;">
                <img src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80" alt="Site Management" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;" />
            </div>

            <p class="lead">Un sistem performant de pontaj nu reprezinta o cheltuiala, ci o masura de reducere a pierderilor cu amortizare imediata.</p>

            <div class="card">
                <h3 style="color: var(--white);">Calculul Pierderilor Invizibile</h3>
                <p>Sa luam un exemplu conservator pentru o companie medie de constructii:</p>
                <ul>
                    <li>Echipa: <span class="highlight">50 angajati de teren</span></li>
                    <li>Timp pierdut nejustificat per angajat (intarzieri mici, pauze depasite, plecari premature nesemnalate): <span class="highlight">O medie de 20 minute / zi</span></li>
                    <li>Cost ora bruta / angajat: <span class="highlight">Aprox. 40 RON</span></li>
                </ul>
                <div style="background: var(--navy-dark); padding: 15px; border-radius: 6px; border: 1px dashed var(--accent-blue); margin-top: 15px;">
                    <p style="margin-bottom: 5px; color: var(--white);">50 angajati × 20 min/zi × 21 zile = <strong>350 ore lunar platite nelucrate</strong></p>
                    <p style="margin-bottom: 0; font-size: 20px; color: #ff5f56; font-weight: bold;">Pierdere financiara: ~ 14.000 RON / luna</p>
                </div>
            </div>

            <p style="text-align: center; margin-top: 30px;">Implementarea Ecosistemului <strong>Pontaj Digital</strong> amortizeaza costul abonamentului inca din prima saptamana de functionare, readucand disciplina in santiere si transparenta in bugetele salariale.</p>

            <div class="contact-box">
                <h3>Sunteti pregatiti sa digitalizati santierul?</h3>
                <p>Solicitati un demo fizic pe un santier pilot fara obligatii financiare.</p>
            </div>

            <div class="footer">
                <div>Prezentare Solutie Enterprise</div>
                <div>Pagina 4</div>
            </div>
        </div>
    </div>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, 'temp_premium_template.html'), htmlTemplate);

async function generatePDF() {
    console.log("Starting Puppeteer generation...");
    try {
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        await page.goto('file://' + path.join(__dirname, 'temp_premium_template.html'), { waitUntil: 'networkidle0' });

        await page.pdf({
            path: OUTPUT_PDF,
            format: 'A4',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' }
        });

        await browser.close();

        // Cleanup temp file
        fs.unlinkSync(path.join(__dirname, 'temp_premium_template.html'));
        console.log("PDF generated successfully at:", OUTPUT_PDF);
    } catch (e) {
        console.error("Error generating PDF:", e);
    }
}

generatePDF();
