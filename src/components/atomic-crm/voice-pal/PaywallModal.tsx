import React, { useState } from "react";
import {
  PayPalScriptProvider,
  PayPalButtons,
} from "@paypal/react-paypal-js";
import { voiceAuth } from "@/lib/voice-auth";
import { useAuth } from "./AuthContext";

// No paywall in the open-source build — the app is free and offline. This
// modal is never shown (local profile is always unlimited). Any payment
// credential is intentionally absent; set one only if you re-enable billing.
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || "";

type PaywallModalProps = {
  isOpen: boolean;
  onClose: () => void;
  messageCount: number;
  freeLimit: number;
  onSuccess: () => void;
};

function ModalContent({
  onClose,
  messageCount,
  freeLimit,
  onSuccess,
}: Omit<PaywallModalProps, "isOpen">) {
  const { user, refreshProfile } = useAuth();
  const [paypalError, setPaypalError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const progress = Math.min((messageCount / freeLimit) * 100, 100);

  const createOrder = async () => {
    setPaypalError(null);
    const res = await fetch("http://localhost:3001/api/paypal/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: "12.00" }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to create order");
    return data.orderID as string;
  };

  const onApprove = async (data: { orderID: string }) => {
    setProcessing(true);
    setPaypalError(null);
    try {
      const res = await fetch("http://localhost:3001/api/paypal/capture-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderID: data.orderID }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error ?? "Payment not completed");
      }

      // Update profile plan to "paid" in Supabase
      if (user) {
        await voiceAuth
          .from("profiles")
          .update({ plan: "paid" })
          .eq("id", user.id);
        await refreshProfile();
      }

      setSucceeded(true);
      onSuccess();
    } catch (err: any) {
      setPaypalError(err?.message ?? "Payment failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const onError = (err: Record<string, unknown>) => {
    console.error("PayPal error", err);
    setPaypalError("PayPal encountered an error. Please try again.");
  };

  if (succeeded) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">You&apos;re all set!</h2>
        <p className="text-gray-500 text-sm mb-6">Enjoy unlimited access to My Jarvis Voice.</p>
        <button
          onClick={onClose}
          className="bg-blue-600 text-white rounded-xl px-6 py-2.5 text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Upgrade to Voice Pal Pro</h2>
          <p className="text-sm text-gray-500 mt-1">Unlock unlimited AI voice messages</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Usage indicator */}
      <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-6">
        <p className="text-sm font-medium text-orange-800 mb-2">
          You&apos;ve used {messageCount} of {freeLimit} free messages
        </p>
        <div className="w-full bg-orange-100 rounded-full h-2">
          <div
            className="bg-orange-400 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Price */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-5 mb-6 text-white text-center">
        <p className="text-3xl font-bold mb-1">$12</p>
        <p className="text-sm opacity-90">One-time payment — unlimited access forever</p>
      </div>

      {/* Features */}
      <ul className="space-y-2 mb-6">
        {[
          "Unlimited voice messages",
          "All AI voices available",
          "Priority response times",
          "No monthly fees",
        ].map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
            <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {f}
          </li>
        ))}
      </ul>

      {/* PayPal */}
      {processing ? (
        <div className="flex items-center justify-center py-6">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3" />
          <span className="text-sm text-gray-600">Processing payment...</span>
        </div>
      ) : (
        <PayPalButtons
          style={{ layout: "vertical", shape: "rect", label: "pay" }}
          createOrder={createOrder}
          onApprove={onApprove}
          onError={onError}
        />
      )}

      {paypalError && (
        <p className="mt-3 text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {paypalError}
        </p>
      )}
    </>
  );
}

export function PaywallModal(props: PaywallModalProps) {
  const { isOpen, onClose, messageCount, freeLimit, onSuccess } = props;

  if (!isOpen) return null;

  return (
    <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: "USD" }}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 relative">
          <ModalContent
            onClose={onClose}
            messageCount={messageCount}
            freeLimit={freeLimit}
            onSuccess={onSuccess}
          />
        </div>
      </div>
    </PayPalScriptProvider>
  );
}
