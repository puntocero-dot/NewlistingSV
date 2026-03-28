import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

// Inicializar Resend usando la variable de entorno RESEND_API_KEY
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

export const emailService = {
  /**
   * Notifica al vendedor (Agente) que tiene un nuevo lead calificado por ARIA.
   */
  async sendAgentNotification(agentEmail: string, leadData: { name?: string, email?: string, phone?: string, date?: string }) {
    if (!process.env.RESEND_API_KEY) {
      console.log('⚠️ Simulación de Email a Agente:', agentEmail, leadData);
      return;
    }

    try {
      const { data, error } = await resend.emails.send({
        from: 'New Listing ARIA <onboarding@resend.dev>', // Usa dominio verificado en producción
        to: agentEmail,
        subject: `🔥 Nuevo Lead de ARIA: ${leadData.email || leadData.phone}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background: #fafafa;">
            <div style="background: white; padding: 30px; border-radius: 10px; border-top: 5px solid #C9A96E;">
              <h2 style="color: #111;">¡Tienes un nuevo Lead calificado!</h2>
              <p style="color: #666;">ARIA acaba de perfilar a un cliente potencial que está listo para agendar una visita.</p>
              
              <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Email:</strong> ${leadData.email || 'No provisto'}</p>
                <p><strong>Teléfono:</strong> ${leadData.phone || 'No provisto'}</p>
                <p><strong>Horario preferido:</strong> ${leadData.date || 'No especificado'}</p>
              </div>
              
              <p>Por favor contacta a este cliente lo más pronto posible para cerrar el trato.</p>
            </div>
          </div>
        `
      });

      if (error) console.error('Error enviando correo a agente:', error);
      else console.log('Correo enviado al agente:', data);
    } catch (e) {
      console.error('Excepción Resend:', e);
    }
  },

  /**
   * Envía confirmación cordial y corporativa al cliente potencial.
   */
  async sendClientConfirmation(clientEmail: string, visitDate?: string) {
    if (!process.env.RESEND_API_KEY) {
      console.log('⚠️ Simulación de Email a Cliente:', clientEmail, visitDate);
      return;
    }

    try {
      const { data, error } = await resend.emails.send({
        from: 'New Listing SV <onboarding@resend.dev>', 
        to: clientEmail,
        subject: 'Cita en proceso - New Listing El Salvador',
        html: `
          <div style="font-family: serif; padding: 40px; background: #111; color: white;">
            <div style="max-width: 500px; margin: 0 auto; text-align: center;">
              <h1 style="color: #C9A96E; letter-spacing: 2px;">NEW LISTING</h1>
              <p style="letter-spacing: 1px; font-size: 12px; color: #888; text-transform: uppercase;">El Salvador</p>
              
              <h3 style="margin-top: 40px; font-weight: normal;">Confirmación de Solicitud</h3>
              
              <p style="color: #ddd; font-family: sans-serif; line-height: 1.6; font-size: 14px;">
                Estimado/a cliente,<br><br>
                Hemos recibido sus datos a través de nuestro asistente ARIA. Un asesor exclusivo 
                de nuestra cartera premium ha sido notificado y se pondrá en contacto con usted 
                a la brevedad para coordinar su visita.
                ${visitDate ? `<br><br><strong>Horario sugerido:</strong> ${visitDate}` : ''}
              </p>
              
              <div style="margin-top: 40px; border-top: 1px solid #333; padding-top: 20px;">
                <p style="color: #666; font-family: sans-serif; font-size: 11px;">
                  New Listing El Salvador &copy; 2026<br>
                  Confidencialidad y Lujo.
                </p>
              </div>
            </div>
          </div>
        `
      });

      if (error) console.error('Error enviando correo a cliente:', error);
      else console.log('Correo enviado al cliente:', data);
    } catch (e) {
      console.error('Excepción Resend:', e);
    }
  }
};
