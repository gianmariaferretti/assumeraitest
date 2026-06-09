"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Mail,
  MessageCircle,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

const trustMarks = ["ESCP", "Enel", "EY", "JPMorgan", "Reed", "Assumerai"];
const teamImagePositions = ["object-[50%_38%]", "object-[34%_52%]"];

export default function ContactTeamPage() {
  const { t } = useI18n();
  const contact = t.contactTeam;

  return (
    <div
      className="bg-slate-50 text-[#0b2146]"
      style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
    >
      <section className="px-4 pb-12 pt-24 sm:px-6 lg:px-8 lg:pb-16">
        <div className="mx-auto max-w-[1040px] overflow-hidden rounded-[22px] bg-white shadow-[0_24px_72px_rgba(15,23,42,0.11)] ring-1 ring-slate-900/5">
          <div className="grid lg:min-h-[640px] lg:grid-cols-[minmax(250px,0.72fr)_minmax(0,1.58fr)]">
            <aside
              aria-label="Contact us panel"
              className="flex flex-col overflow-hidden bg-[#f8f7f4] lg:min-h-full"
            >
              <div className="relative h-[280px] min-w-0 flex-1 sm:h-[320px] lg:h-auto">
                <Image
                  alt={contact.orbitAlt}
                  className="object-cover object-[58%_43%] sm:object-center"
                  fill
                  priority
                  sizes="(min-width: 1024px) 310px, 100vw"
                  src="/contact/team-orbit.png"
                />
              </div>

              <div className="grid shrink-0 gap-2 border-t border-slate-200/70 bg-[#f8f7f4]/95 px-5 py-4 text-sm font-medium text-slate-700 lg:border-t-0 lg:px-5 lg:pb-5 lg:pt-0">
                {contact.socials.map((item) => (
                  <a
                    className="inline-flex items-center gap-2 transition-colors hover:text-slate-950"
                    href={item.href}
                    key={item.label}
                  >
                    <span className="inline-flex size-8 items-center justify-center rounded-full bg-white text-slate-800 shadow-[0_10px_28px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/5">
                      {item.kind === "mail" ? (
                        <Mail className="size-4" aria-hidden="true" />
                      ) : item.kind === "linkedin" ? (
                        <BriefcaseBusiness className="size-4" aria-hidden="true" />
                      ) : (
                        <MessageCircle className="size-4" aria-hidden="true" />
                      )}
                    </span>
                    {item.label}
                  </a>
                ))}
              </div>
            </aside>

            <div
              className="relative overflow-hidden px-5 py-8 sm:px-9 sm:py-10 lg:px-14 lg:py-10"
              style={{
                background:
                  "radial-gradient(circle at 92% 8%, rgba(255,255,255,0.66), transparent 18rem), radial-gradient(circle at 8% 88%, rgba(255,255,255,0.42), transparent 22rem), linear-gradient(110deg, #f7c8d9 0%, #e0b8e6 35%, #b9b8ee 65%, #a8c5f1 100%)",
              }}
            >
              <div className="relative z-10 mx-auto max-w-[540px]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-800/65">
                  {contact.eyebrow}
                </p>
                <h1 className="mt-3 text-[clamp(2.1rem,4vw,3.2rem)] font-light leading-[1.04] tracking-[-0.055em] text-slate-950">
                  {contact.title}
                </h1>
                <p className="mt-4 max-w-[34rem] text-base font-normal leading-7 text-slate-700 sm:text-[1.05rem]">
                  {contact.body}
                </p>

                <form className="mt-7 grid gap-4" aria-label={contact.formLabel}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      id="first-name"
                      label={contact.fields.firstName}
                      placeholder={contact.fields.firstName}
                    />
                    <FormField
                      id="last-name"
                      label={contact.fields.lastName}
                      placeholder={contact.fields.lastName}
                    />
                  </div>

                  <FormField
                    id="email"
                    label={contact.fields.email}
                    placeholder={contact.fields.emailPlaceholder}
                    type="email"
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <SelectField
                      id="team-size"
                      label={contact.fields.teamSize}
                      options={contact.teamSizeOptions}
                    />
                    <SelectField
                      id="location"
                      label={contact.fields.location}
                      options={contact.locationOptions}
                    />
                  </div>

                  <div>
                    <label
                      className="text-[0.78rem] font-semibold text-slate-800"
                      htmlFor="message"
                    >
                      {contact.fields.message}
                    </label>
                    <textarea
                      className="mt-2 min-h-[112px] w-full resize-y rounded-[8px] border border-white/80 bg-white px-4 py-3 text-[14px] font-normal text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] outline-none placeholder:text-slate-400 focus:border-slate-950/20 focus:ring-4 focus:ring-white/45"
                      id="message"
                      name="message"
                      placeholder={contact.fields.messagePlaceholder}
                      required
                    />
                  </div>

                  <label className="flex items-start gap-3 text-sm font-normal leading-6 text-slate-800">
                    <input
                      className="mt-1 size-4 rounded border-white bg-white accent-slate-950"
                      name="privacy"
                      required
                      type="checkbox"
                    />
                    <span>
                      {contact.privacyPrefix}{" "}
                      <Link
                        className="font-semibold underline decoration-slate-950/35 underline-offset-4 hover:decoration-slate-950"
                        href="#privacy"
                      >
                        {contact.privacyLink}
                      </Link>
                      .
                    </span>
                  </label>

                  <button
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[8px] bg-slate-950 px-6 text-[14px] font-semibold text-white shadow-[0_20px_46px_rgba(15,23,42,0.28)] transition-transform hover:scale-[1.01] active:scale-[0.98]"
                    type="submit"
                  >
                    {contact.submit}
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </button>
                </form>

                <div className="mt-7">
                  <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-800/60">
                    {contact.trustLabel}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-x-7 gap-y-4 text-[clamp(0.98rem,1.8vw,1.2rem)] font-semibold tracking-[-0.03em] text-slate-950">
                    {trustMarks.map((mark) => (
                      <span key={mark}>{mark}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-label="Our team profiles"
        className="bg-white px-5 py-16 sm:px-6 sm:py-20 lg:px-8"
        id="team"
      >
        <div className="mx-auto max-w-[1120px]">
          <div className="max-w-xl">
            <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-3xl">
              {contact.team.title}
            </h2>
            <p className="mt-4 max-w-[34rem] text-sm font-normal leading-6 text-slate-600 sm:text-[0.95rem]">
              {contact.team.body}
            </p>
          </div>

          <div className="mt-10 grid max-w-[560px] gap-6 sm:grid-cols-2">
            {contact.team.members.map((member, index) => (
              <article key={`${member.name}-${member.role}`}>
                <div className="relative aspect-[4/5] overflow-hidden rounded-[8px] bg-slate-100">
                  <Image
                    alt={member.imageAlt}
                    className={`object-cover ${teamImagePositions[index] ?? "object-center"}`}
                    fill
                    sizes="(min-width: 768px) 268px, (min-width: 640px) 45vw, 100vw"
                    src={member.image}
                  />
                </div>
                <h3 className="mt-4 text-base font-semibold tracking-[-0.02em] text-slate-950">
                  {member.name}
                </h3>
                <p className="mt-2 text-sm font-normal leading-5 text-slate-500">
                  {member.role}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function FormField({
  id,
  label,
  placeholder,
  type = "text",
}: {
  id: string;
  label: string;
  placeholder: string;
  type?: "email" | "text";
}) {
  return (
    <div>
      <label className="text-[0.78rem] font-semibold text-slate-800" htmlFor={id}>
        {label}
      </label>
      <input
        className="mt-2 h-12 w-full rounded-[8px] border border-white/80 bg-white px-4 text-[14px] font-normal text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] outline-none placeholder:text-slate-400 focus:border-slate-950/20 focus:ring-4 focus:ring-white/45"
        id={id}
        name={id}
        placeholder={placeholder}
        required
        type={type}
      />
    </div>
  );
}

function SelectField({
  id,
  label,
  options,
}: {
  id: string;
  label: string;
  options: string[];
}) {
  return (
    <div>
      <label className="text-[0.78rem] font-semibold text-slate-800" htmlFor={id}>
        {label}
      </label>
      <select
        className="mt-2 h-12 w-full rounded-[8px] border border-white/80 bg-white px-4 text-[14px] font-medium text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] outline-none focus:border-slate-950/20 focus:ring-4 focus:ring-white/45"
        id={id}
        name={id}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}
