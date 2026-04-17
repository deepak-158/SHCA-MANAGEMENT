import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { to, name, email, tempPassword, role, studentName, studentEmail, studentPassword, parentEmail, parentPassword } = await request.json();

        if (!to) {
            return NextResponse.json({ error: 'Missing recipient email' }, { status: 400 });
        }

        const gmailUser = process.env.GMAIL_USER;
        const gmailPass = process.env.GMAIL_APP_PASSWORD;

        if (!gmailUser || !gmailPass) {
            return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: gmailUser,
                pass: gmailPass,
            },
        });

        let subject = '';
        let html = '';

        if (role === 'dual') {
            subject = `Welcome to School Management System — Parent & Student Login`;
            html = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 2rem;">
                <div style="background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%); padding: 2rem; border-radius: 1rem 1rem 0 0; text-align: center;">
                    <h1 style="color: #fff; margin: 0; font-size: 1.5rem;">🎓 School Management System</h1>
                    <p style="color: rgba(255,255,255,0.8); margin: 0.5rem 0 0; font-size: 0.9rem;">Welcome aboard!</p>
                </div>
                <div style="background: #fff; padding: 2rem; border-radius: 0 0 1rem 1rem; border: 1px solid #e2e8f0; border-top: 0;">
                    <p style="font-size: 1rem; color: #1e293b;">Hello <strong>${name}</strong>,</p>
                    <p style="color: #475569; line-height: 1.6;">
                        Your child <strong>${studentName}</strong> has been successfully enrolled! 
                        Below you will find the login credentials for your dedicated Parent Portal, as well as the separate login for your child's Student Portal.
                    </p>
                    
                    <h3 style="color: #1e293b; margin-top: 2rem; margin-bottom: 0.5rem;">👨‍👩‍👧 Parent Portal Login</h3>
                    <div style="background: #f1f5f9; border-left: 4px solid #4338ca; padding: 1.25rem; margin-bottom: 1.5rem;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 0.5rem 0; color: #64748b; font-size: 0.875rem; width: 120px;">Login Email</td>
                                <td style="padding: 0.5rem 0; font-weight: 600; color: #1e293b; font-family: monospace;">${parentEmail}</td>
                            </tr>
                            <tr>
                                <td style="padding: 0.5rem 0; color: #64748b; font-size: 0.875rem;">Temp Password</td>
                                <td style="padding: 0.5rem 0; font-weight: 600; color: #1e293b; font-family: monospace;">${parentPassword}</td>
                            </tr>
                        </table>
                    </div>

                    <h3 style="color: #1e293b; margin-bottom: 0.5rem;">🎒 Student Portal Login</h3>
                    <div style="background: #f1f5f9; border-left: 4px solid #10b981; padding: 1.25rem; margin-bottom: 1.5rem;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 0.5rem 0; color: #64748b; font-size: 0.875rem; width: 120px;">Login Email</td>
                                <td style="padding: 0.5rem 0; font-weight: 600; color: #1e293b; font-family: monospace;">${studentEmail}</td>
                            </tr>
                            <tr>
                                <td style="padding: 0.5rem 0; color: #64748b; font-size: 0.875rem;">Temp Password</td>
                                <td style="padding: 0.5rem 0; font-weight: 600; color: #1e293b; font-family: monospace;">${studentPassword}</td>
                            </tr>
                        </table>
                    </div>

                    <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 0.5rem; padding: 0.75rem 1rem; margin-bottom: 1.5rem;">
                        <p style="margin: 0; font-size: 0.875rem; color: #92400e;">
                            ⚠️ <strong>Important:</strong> You will be required to change your passwords on the first login.
                        </p>
                    </div>
                </div>
            </div>`;
        } else {
            // standard single account delivery
            const roleLabel = role === 'student' ? 'Student' : role === 'class_teacher' ? 'Class Teacher' : role === 'subject_teacher' ? 'Subject Teacher' : 'User';
            subject = `Your ${roleLabel} Account — Login Credentials`;
            html = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 2rem;">
                <div style="background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%); padding: 2rem; border-radius: 1rem 1rem 0 0; text-align: center;">
                    <h1 style="color: #fff; margin: 0; font-size: 1.5rem;">🎓 School Management System</h1>
                    <p style="color: rgba(255,255,255,0.8); margin: 0.5rem 0 0; font-size: 0.9rem;">Welcome aboard!</p>
                </div>
                <div style="background: #fff; padding: 2rem; border-radius: 0 0 1rem 1rem; border: 1px solid #e2e8f0; border-top: 0;">
                    <p style="font-size: 1rem; color: #1e293b;">Hello <strong>${name}</strong>,</p>
                    <p style="color: #475569; line-height: 1.6;">
                        Your <strong>${roleLabel}</strong> account has been created. Use the credentials below to log in:
                    </p>
                    <div style="background: #f1f5f9; border-radius: 0.75rem; padding: 1.25rem; margin: 1.5rem 0;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 0.5rem 0; color: #64748b; font-size: 0.875rem; width: 120px;">Login Email</td>
                                <td style="padding: 0.5rem 0; font-weight: 600; color: #1e293b; font-family: monospace;">${email}</td>
                            </tr>
                            <tr>
                                <td style="padding: 0.5rem 0; color: #64748b; font-size: 0.875rem;">Temp Password</td>
                                <td style="padding: 0.5rem 0; font-weight: 600; color: #1e293b; font-family: monospace;">${tempPassword}</td>
                            </tr>
                        </table>
                    </div>
                    <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 0.5rem; padding: 0.75rem 1rem; margin-bottom: 1.5rem;">
                        <p style="margin: 0; font-size: 0.875rem; color: #92400e;">
                            ⚠️ <strong>Important:</strong> You will be asked to change your password on first login.
                        </p>
                    </div>
                    <p style="color: #64748b; font-size: 0.8125rem; margin-bottom: 0;">
                        If you didn't expect this email, please contact your school administrator.
                    </p>
                </div>
            </div>`;
        }

        await transporter.sendMail({
            from: `"School Management System" <${gmailUser}>`,
            to,
            subject,
            html,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Email sending failed:', error);
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }
}
