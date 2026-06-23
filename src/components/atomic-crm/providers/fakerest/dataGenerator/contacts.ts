import {
  company as fakerCompany,
  internet,
  lorem,
  name,
  phone,
  random,
} from "faker/locale/en_US";

import {
  defaultContactGender,
  defaultNoteStatuses,
} from "../../../root/defaultConfiguration";
import type { Company, Contact } from "../../../types";
import type { Db } from "./types";
import { randomDate, weightedBoolean } from "./utils";

const maxContacts = {
  1: 1,
  10: 4,
  50: 12,
  250: 25,
  500: 50,
};

const getRandomContactDetailsType = () =>
  random.arrayElement(["Work", "Home", "Other"]) as "Work" | "Home" | "Other";

export const generateContacts = (db: Db, size = 500): Required<Contact>[] => {
  const nbAvailblePictures = 223;
  let numberOfContacts = 0;

  return Array.from(Array(size).keys()).map((id) => {
    const has_avatar =
      weightedBoolean(25) && numberOfContacts < nbAvailblePictures;
    const gender = random.arrayElement(defaultContactGender).value;
    const first_name = name.firstName(gender as any);
    const last_name = name.lastName();
    const email_jsonb = [
      {
        email: internet.email(first_name, last_name),
        type: getRandomContactDetailsType(),
      },
    ];
    const phone_jsonb = [
      {
        phone: phone.phoneNumber(),
        type: getRandomContactDetailsType(),
      },
      {
        phone: phone.phoneNumber(),
        type: getRandomContactDetailsType(),
      },
    ];
    const avatar = {
      src: has_avatar
        ? "https://marmelab.com/posters/avatar-" +
          (223 - numberOfContacts) +
          ".jpeg"
        : undefined,
    };
    const title = fakerCompany.bsAdjective();

    if (has_avatar) {
      numberOfContacts++;
    }

    // choose company with people left to know
    let company: Required<Company>;
    do {
      company = random.arrayElement(db.companies);
    } while (company.nb_contacts >= maxContacts[company.size]);
    company.nb_contacts++;

    const first_seen = randomDate(new Date(company.created_at)).toISOString();
    const last_seen = first_seen;

    const lifecycle_stage = random.arrayElement(["new_lead", "new_lead", "new_lead", "active", "active", "returning", "vip", "inactive"]);
    const isLead = lifecycle_stage === "new_lead";

    // Lead pipeline fields — only meaningful for leads
    const activity_status = isLead
      ? random.arrayElement(["new", "new", "no_answer", "follow_up", "follow_up", "appointment_set", "lost_lead", "purchase"])
      : "none";
    const qualification_status = isLead
      ? random.arrayElement(["select", "select", "qualified", "qualified", "disqualified"])
      : "select";
    const readiness_to_book = isLead && qualification_status === "qualified"
      ? random.arrayElement(["high", "medium", "low"])
      : null;
    const lost_reason = isLead && (activity_status === "lost_lead" || qualification_status === "disqualified")
      ? random.arrayElement(["price", "product_fit", "distance", "solved_with_competitor", "timing", "other"])
      : null;

    const lead_source = random.arrayElement(["website", "web_exam", "web_styling", "messenger", "organic", "paid", "referral", "walk_in", "phone"]);

    return {
      id,
      first_name,
      last_name,
      gender,
      title: title.charAt(0).toUpperCase() + title.substr(1),
      company_id: company.id,
      company_name: company.name,
      email_jsonb,
      phone_jsonb,
      background: lorem.sentence(),
      lifecycle_stage,
      lead_source,
      date_of_birth: weightedBoolean(70) ? randomDate(new Date(1950, 0, 1), new Date(2005, 11, 31)).toISOString().split('T')[0] : null,
      id_number: weightedBoolean(60) ? String(Math.floor(100000000 + Math.random() * 900000000)) : null,
      // Lead pipeline fields
      activity_status,
      qualification_status,
      readiness_to_book,
      lost_reason,
      lead_bio: isLead ? lorem.sentences(2) : null,
      followup_prompt: isLead && activity_status === "follow_up" ? lorem.sentence() : null,
      followup_date: isLead && activity_status === "follow_up" ? randomDate(new Date(), new Date(Date.now() + 14 * 86400000)).toISOString().split('T')[0] : null,
      last_contact_at: isLead ? randomDate(new Date(Date.now() - 30 * 86400000)).toISOString() : null,
      utm_source: isLead && weightedBoolean(60) ? random.arrayElement(["facebook", "google", "instagram"]) : null,
      utm_medium: isLead && weightedBoolean(60) ? random.arrayElement(["cpc", "social", "organic"]) : null,
      utm_campaign: isLead && weightedBoolean(40) ? random.arrayElement(["summer_2026", "exam_promo", "new_collection"]) : null,
      utm_content: null,
      utm_term: null,
      manychat_id: isLead && lead_source?.startsWith("web_") ? String(Math.floor(10000000 + Math.random() * 90000000)) : null,
      avatar,
      first_seen: first_seen,
      last_seen: last_seen,
      has_newsletter: weightedBoolean(30),
      status: random.arrayElement(defaultNoteStatuses).value,
      tags: random
        .arrayElements(db.tags, random.arrayElement([0, 0, 0, 1, 1, 2]))
        .map((tag) => tag.id), // finalize
      member_id: company.member_id,
      nb_tasks: 0,
      linkedin_url: null,
    };
  });
};
