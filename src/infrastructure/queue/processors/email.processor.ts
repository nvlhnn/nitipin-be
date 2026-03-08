import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants.js';
import type { EmailJobData } from '../queue.service.js';

@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  async process(job: Job<EmailJobData>): Promise<void> {
    const { to, subject, template, context } = job.data;

    await job.log(`Email template ${template} queued for ${to}`);

    this.logger.log(
      `Processing email job: ${job.name} → ${to} [${template}] (${subject})`,
    );

    // TODO: Integrate with SendGrid / Nodemailer / AWS SES
    //
    // Example with SendGrid:
    // import * as sgMail from '@sendgrid/mail';
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send({
    //   to,
    //   from: 'noreply@nitipin.com',
    //   subject,
    //   templateId: TEMPLATE_MAP[template],
    //   dynamicTemplateData: context,
    // });

    this.logger.log(
      `Email sent successfully: ${job.name} → ${to} (context keys: ${Object.keys(context).length})`,
    );
  }
}
