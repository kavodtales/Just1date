export const legalDocuments: Record<
  string,
  { title: string; paragraphs: string[] }
> = {
  terms: {
    title: "Terms of Service — draft",
    paragraphs: [
      "JUST1DATE is intended for adults aged 18 or above who meet the applicable platform minimum. Accounts must use truthful information and respect other members.",
      "Do not impersonate others, solicit money deceptively, harass, threaten or post illegal content. Reports are reviewed by a human moderation process.",
      "Compatibility and AI suggestions are informational. They cannot establish identity, guarantee safety or predict a relationship.",
      "Before launch, counsel must finalize entity/contact details, governing law, disputes, liability, consent, termination, jurisdiction-specific age rules and consumer rights.",
    ],
  },
  privacy: {
    title: "Privacy Policy — draft",
    paragraphs: [
      "The implementation uses account details, age, explicit preferences, profile content and interactions to provide authentication, discovery, messaging and moderation. Private date of birth, contacts and verification evidence must not appear in discovery.",
      "Location collection requires permission. City-based discovery works without precise coordinates. Verification documents require strict staff access and retention deadlines.",
      "AI is disabled by default. When enabled, explicit interests, intentions and communication preferences may be sent to the configured provider. AI does not automatically send messages or make bans.",
      "Before launch, document the controller, legal bases, processors, international transfers, rights/contact process, retention schedules, backup erasure and incident handling. Account erasure processing and comprehensive exports remain release gates.",
    ],
  },
  guidelines: {
    title: "Community Guidelines — draft",
    paragraphs: [
      "Be honest, kind and respectful. Consent matters in every conversation. Respect boundaries and do not pursue a member who declines contact.",
      "Do not request money, share threats, send spam, promote hate or impersonate another person. Report underage profiles and suspected scams.",
      "Moderators review concerns and record decisions. Automated risk signals create review work; they do not independently ban an account.",
    ],
  },
  safety: {
    title: "Safety Guidelines — draft",
    paragraphs: [
      "Meet in a public place, arrange your own transport and tell someone you trust about your plans. Keep your private home location, financial details and identity documents to yourself.",
      "Do not send money or cryptocurrency to people you meet here. If a conversation makes you uncomfortable, stop, block and report.",
      "Date sessions currently record plans and check-ins. Automated emergency alerts and live location sharing are unavailable. Contact local emergency services directly if you are in danger.",
    ],
  },
  cookies: {
    title: "Cookie Policy — draft",
    paragraphs: [
      "The web client uses essential secure session cookies to maintain authentication. It does not currently implement advertising or cross-site tracking.",
      "Before enabling analytics cookies or other nonessential storage, complete the appropriate consent flow, vendor inventory and jurisdiction-specific review.",
    ],
  },
  subscriptions: {
    title: "Subscription Terms — draft",
    paragraphs: [
      "Plans and prices are configured by the operator in the database. Paid checkout remains unavailable until configured. Access is granted only after server verification of payment.",
      "Current Paystack memberships grant a fixed paid period with manual renewal. Cancellation leaves access until the paid period ends. Recurring and native store subscriptions require separate integration.",
      "Before launch, finalize consumer disclosures, renewals, taxes, cancellation, grace periods, provider limitations and store billing terms.",
    ],
  },
  refunds: {
    title: "Refund Policy — draft",
    paragraphs: [
      "Refunds are not automated in this build. Do not promise refund outcomes or deadlines until the operator has an approved process and provider integration.",
      "Before enabling sales, counsel and finance must approve refund eligibility, contact channels, payment reconciliation, applicable consumer rights and subscription revocation rules.",
    ],
  },
};
