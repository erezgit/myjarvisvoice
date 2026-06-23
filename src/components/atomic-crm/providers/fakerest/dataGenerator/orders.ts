import type { Order } from "../../../types";
import type { Db } from "./types";

const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'completed', 'cancelled'] as const;

const DESCRIPTIONS = [
  "Standard service package",
  "Premium consultation",
  "Monthly subscription",
  "Custom project",
  "Support plan",
  "Equipment rental",
  "Training session",
  "Setup & installation",
  "Annual maintenance",
  "Starter kit",
];

// Determine which dates are set based on status progression
const statusIndex = (status: string) =>
  ORDER_STATUSES.indexOf(status as (typeof ORDER_STATUSES)[number]);

export const generateOrders = (db: Db, size = 50): Order[] => {
  return Array.from(Array(size).keys()).map((id) => {
    const contact = db.contacts[id % db.contacts.length];
    const members = db.members;
    const member = members[id % members.length];
    const status = ORDER_STATUSES[id % ORDER_STATUSES.length];
    const idx = statusIndex(status);

    const orderDate = new Date();
    orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 60));

    const dayMs = 24 * 60 * 60 * 1000;

    const totalAmount = Math.round((200 + Math.random() * 800) * 100) / 100;
    const openBalance = idx >= statusIndex('completed')
      ? 0
      : Math.round((Math.random() * totalAmount * 0.5) * 100) / 100;

    return {
      id: id + 1,
      contact_id: contact.id,
      member_id: member.id,
      status,
      order_date: orderDate.toISOString(),
      order_number: `ORD-${String(1000 + id).padStart(4, '0')}`,
      description: DESCRIPTIONS[id % DESCRIPTIONS.length],
      // Dates — progressively filled based on status
      expected_delivery: new Date(orderDate.getTime() + 14 * dayMs).toISOString(),
      completed_date: idx >= statusIndex('completed') ? new Date(orderDate.getTime() + 12 * dayMs).toISOString() : null,
      // Financial
      total_amount: totalAmount,
      open_balance: openBalance,
      notes: "",
      // View fields
      contact_first_name: contact.first_name,
      contact_last_name: contact.last_name,
      member_first_name: member.first_name,
      member_last_name: member.last_name,
      created_at: orderDate.toISOString(),
      updated_at: orderDate.toISOString(),
    };
  });
};
