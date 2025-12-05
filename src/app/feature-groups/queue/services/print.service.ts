import { Injectable } from '@angular/core';

/**
 * Servicio para manejar la impresión de códigos y QR
 */
@Injectable({
  providedIn: 'root'
})
export class PrintService {

  /**
   * Imprime el código público y el QR en la impresora predeterminada
   * @param publicCode Código público del turno
   * @param qrCodeUrl URL del código QR generado
   * @param hasAppointment Indica si el paciente tiene turno
   */
  printTicket(publicCode: string, qrCodeUrl: string, hasAppointment: boolean): void {
    // Crear una ventana de impresión oculta
    const printWindow = window.open('', '_blank', 'width=300,height=400');

    if (!printWindow) {
      // console.error('No se pudo abrir la ventana de impresión');
      return;
    }

    const currentDate = new Date().toLocaleDateString('es-AR');
    const currentTime = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
    const ticketStatus = hasAppointment ? 'Con Turno' : 'Sin Turno';

    // Contenido HTML del ticket simplificado según especificación
    const ticketHtml = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Ticket - ${publicCode}</title>
          <style>
            @page {
              size: 80mm;
              margin: 2mm;
            }

            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: 'Courier New', monospace;
              width: 80mm;
              padding: 2mm;
              background: white;
            }

            .ticket-wrapper {
              width: 100%;
            }

            .ticket-print-area {
              text-align: center;
            }

            .ticket-box {
              border: 2px solid #000;
              padding: 8px;
              background: white;
            }

            .ticket-logo {
              text-align: center;
              margin-bottom: 6px;
              padding: 6px;
              background: #f0f0f0;
            }

            .logo-img {
              max-width: 120px;
              height: auto;
              display: block;
              margin: 0 auto;
              filter: brightness(0.3) contrast(1.5);
            }

            .ticket-status {
              background: ${hasAppointment ? '#4CAF50' : '#2196F3'};
              color: white;
              padding: 4px;
              margin-bottom: 6px;
              font-size: 11px;
              font-weight: bold;
              border-radius: 2px;
            }

            .ticket-label {
              font-size: 24px;
              font-weight: bold;
              letter-spacing: 2px;
              margin: 6px 0;
              padding: 6px;
              color: #000;
            }

            .ticket-subtext {
              font-size: 8px;
              color: #000;
              margin: 6px 0 4px 0;
              font-weight: bold;
            }

            .qr-box {
              margin: 6px 0;
              padding: 5px;
            }

            .qr-img {
              width: 100px;
              height: 100px;
              margin: 0 auto;
              display: block;
            }

            .ticket-info {
              margin-top: 6px;
              font-size: 8px;
              color: #000;
              text-align: center;
              padding: 0 3px;
              font-weight: bold;
            }

            .ticket-info > div {
              margin: 2px 0;
            }

            .spacer {
              height: 130px;
            }

            .no-print {
              display: none;
            }

            @media print {
              body {
                padding: 2mm;
              }

              .ticket-box {
                page-break-inside: avoid;
              }

              .no-print {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="ticket-wrapper ticket-print-area">
            <div class="ticket-box">
              <div class="ticket-logo">
                <img src="/LCC-logo-horizontal.png" alt="LCC Laboratorio" class="logo-img" />
              </div>
              <div class="ticket-label">Código: ${publicCode}</div>
              <div class="ticket-subtext">
                Escanea el siguiente QR para acceder al portal
              </div>
              <div class="qr-box">
                <img src="${qrCodeUrl}" class="qr-img" alt="QR" />
              </div>
              <div class="ticket-info">
                <div><strong>Fecha:</strong> ${currentDate}</div>
                <div><strong>Hora:</strong> ${currentTime}</div>
              </div>
              <div class="spacer"></div>
            </div>
          </div>

          <script>
            // Esperar a que las imágenes (logo y QR) se carguen antes de imprimir
            window.onload = function() {
              const logoImage = document.querySelector('.logo-img');
              const qrImage = document.querySelector('.qr-img');
              let logoLoaded = false;
              let qrLoaded = false;

              function checkAndPrint() {
                if (logoLoaded && qrLoaded) {
                  setTimeout(function() {
                    window.print();
                    window.close();
                  }, 500);
                }
              }

              if (logoImage) {
                logoImage.onload = function() {
                  logoLoaded = true;
                  checkAndPrint();
                };
                if (logoImage.complete) {
                  logoLoaded = true;
                }
              } else {
                logoLoaded = true;
              }

              if (qrImage) {
                qrImage.onload = function() {
                  qrLoaded = true;
                  checkAndPrint();
                };
                if (qrImage.complete) {
                  qrLoaded = true;
                }
              } else {
                qrLoaded = true;
              }

              // Si ambas imágenes ya están cargadas
              checkAndPrint();
            };
          </script>
        </body>
      </html>
    `;

    // Escribir el contenido en la ventana de impresión
    printWindow.document.write(ticketHtml);
    printWindow.document.close();
  }

  /**
   * Imprime solo el código público (versión simplificada)
   * @param publicCode Código público del turno
   * @param hasAppointment Indica si el paciente tiene turno
   */
  printCodeOnly(publicCode: string, hasAppointment: boolean): void {
    const printWindow = window.open('', '_blank', 'width=300,height=200');

    if (!printWindow) {
      // console.error('No se pudo abrir la ventana de impresión');
      return;
    }

    const ticketType = hasAppointment ? 'Con Turno' : 'Sin Turno';
    const ticketTypeClass = hasAppointment ? 'with-appointment' : 'without-appointment';
    const currentDate = new Date().toLocaleDateString('es-AR');
    const currentTime = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

    const simpleHtml = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Código - ${publicCode}</title>
          <link rel="stylesheet" href="./print-code.css">
        </head>
        <body>
          <div class="logo">LCC LABORATORIO</div>
          <div class="type ${ticketTypeClass}">${ticketType}</div>
          <div class="code">${publicCode}</div>
          <div class="info">
            ${currentDate} - ${currentTime}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 300);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(simpleHtml);
    printWindow.document.close();
  }
}

