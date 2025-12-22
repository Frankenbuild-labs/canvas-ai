import { NextRequest, NextResponse } from "next/server";
import { listCampaigns, createCampaign } from "@/lib/email-marketing/campaigns-supabase";

const TEST_USER_ID = '11111111-1111-1111-1111-111111111111'

export async function GET() {
  try {
    const campaigns = await listCampaigns(TEST_USER_ID);

    return NextResponse.json({
      success: true,
      data: campaigns,
    });
  } catch (error) {
    console.error("Campaigns fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, template_id, list_ids, subject, content, scheduled_for, from_name, from_email, reply_to } =
      await request.json();

    console.log("Creating campaign with data:", {
      name,
      template_id,
      list_ids,
      scheduled_for
    });

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Campaign name is required" },
        { status: 400 }
      );
    }

    if (!subject || !content) {
      return NextResponse.json(
        { error: "Subject and content are required" },
        { status: 400 }
      );
    }

    if (!list_ids || list_ids.length === 0) {
      return NextResponse.json(
        { error: "At least one list is required" },
        { status: 400 }
      );
    }

    // Create campaign using Supabase
    const campaign = await createCampaign(TEST_USER_ID, {
      name,
      subject,
      content,
      template_id: template_id || null,
      target_list_ids: list_ids,
      scheduled_for: scheduled_for || null,
      from_name: from_name || null,
      from_email: from_email || null,
      reply_to: reply_to || null,
    });

    console.log("Campaign created successfully:", campaign.id);

    return NextResponse.json({
      success: true,
      message: "Campaign created successfully",
      data: campaign,
    });
  } catch (error: any) {
    console.error("Campaign creation error:", error);

    return NextResponse.json(
      {
        error: "Failed to create campaign",
        details: error.message || "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
