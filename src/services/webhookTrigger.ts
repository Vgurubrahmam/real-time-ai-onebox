import dotenv from "dotenv";
dotenv.config();

export async function triggerWebhook(newEmail: any) {
  const webhookUrl = process.env.WEBHOOK_SITE_URL;
  const slackUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error("WEBHOOK_SITE_URL is missing in .env");
    return;
  }

  try {
    if (slackUrl && slackUrl.startsWith("https://hooks.slack.com")) {
      await fetch(slackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `:tada: *New interested lead!*\n*From:* ${newEmail.from}\n*Subject:* ${newEmail.subject}\n*Date:* ${new Date(newEmail.date).toLocaleString()}`,
        }),
      });
      console.log("Slack notification sent.");
    } else {
      console.log("Slack webhook URL not configured or invalid (skipping Slack notification)");
    }

    // Send to external webhook
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "InterestedLead",
        email: newEmail,
      }),
    });
    console.log("External webhook triggered.");
  } catch (err: any) {
    console.error(" Webhook trigger error:", err.message);
  }
}