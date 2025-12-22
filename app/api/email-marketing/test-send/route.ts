import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email-marketing/resend";
// Uses request.url/search params; mark as dynamic so it's not prerendered at build time
export const dynamic = 'force-dynamic'

/**
 * Test endpoint to send a quick email
 * GET /api/email-marketing/test-send?to=your@email.com
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const toEmail = searchParams.get("to");

    if (!toEmail) {
      return NextResponse.json(
        { error: "Missing 'to' parameter. Usage: /api/email-marketing/test-send?to=your@email.com" },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    console.log(`Attempting to send test email to: ${toEmail}`);

    // Send test email using Resend
    const result = await sendEmail({
      from: "onboarding@resend.dev", // Resend's test domain (works without verification)
      to: toEmail,
      subject: "🎉 Test Email from CanvasAI",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #3b82f6;">✅ Email System Working!</h1>
          <p>Congratulations! Your email marketing system is now configured and working.</p>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0; font-size: 18px;">📧 Email Details:</h2>
            <ul style="line-height: 1.8;">
              <li><strong>From:</strong> CanvasAI Email System</li>
              <li><strong>Service:</strong> Resend API</li>
              <li><strong>Status:</strong> Active ✅</li>
              <li><strong>Sent:</strong> ${new Date().toLocaleString()}</li>
            </ul>
          </div>

          <h3>Next Steps:</h3>
          <ol style="line-height: 1.8;">
            <li>Add your contacts at <code>/email/contacts</code></li>
            <li>Create email campaigns at <code>/email/campaigns/new</code></li>
            <li>Track your email performance</li>
          </ol>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            This is a test email from your CanvasAI email marketing system.
          </p>
        </div>
      `,
      text: `
        ✅ Email System Working!
        
        Congratulations! Your email marketing system is now configured and working.
        
        Email Details:
        - From: CanvasAI Email System
        - Service: Resend API
        - Status: Active
        - Sent: ${new Date().toLocaleString()}
        
        Next Steps:
        1. Add your contacts at /email/contacts
        2. Create email campaigns at /email/campaigns/new
        3. Track your email performance
      `
    });

    console.log("✅ Email sent successfully:", result);

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${toEmail}`,
      emailId: result.id,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("❌ Error sending test email:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to send email",
        details: error.toString()
      },
      { status: 500 }
    );
  }
}
