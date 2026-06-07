import { Facebook, Globe, Instagram, Mail, Phone } from "lucide-react";
import { PageStack } from "../components/PageStack";
import { Field } from "../components/Field";
import type { Contacts } from "../types";
import styles from "./ContactsPage.module.css";

interface ContactsPageProps {
  contacts: Contacts;
  isEditing: boolean;
  updateContacts: (patch: Partial<Contacts>) => void;
}

export function ContactsPage({ contacts, isEditing, updateContacts }: ContactsPageProps) {
  return (
    <PageStack>
      <section className="panel">
        <h2 className={styles.pageHeading}>Свържи се с мен</h2>

        {isEditing ? (
          <div className={styles.contactGrid}>
            <Field
              label="Име на треньор"
              value={contacts.trainerName}
              onChange={(v) => updateContacts({ trainerName: v })}
            />
            <Field
              label="Телефон"
              value={contacts.phone}
              onChange={(v) => updateContacts({ phone: v })}
            />
            <Field
              label="Имейл"
              value={contacts.email}
              onChange={(v) => updateContacts({ email: v })}
            />
            <label className="full-field">
              Бележки
              <textarea
                value={contacts.notes}
                onChange={(e) => updateContacts({ notes: e.target.value })}
                placeholder="Допълнителна информация"
              />
            </label>
          </div>
        ) : (
          <>
            {contacts.trainerName ? (
              <p className={styles.trainerName}>{contacts.trainerName}</p>
            ) : null}
            <div className={styles.trainerLinks}>
              {contacts.phone ? (
                <a href={`tel:${contacts.phone.replace(/\s/g, "")}`}>
                  <Phone size={14} />
                  {contacts.phone}
                </a>
              ) : null}
              {contacts.email ? (
                <a href={`mailto:${contacts.email}`}>
                  <Mail size={14} />
                  {contacts.email}
                </a>
              ) : null}
              <a href="https://www.facebook.com/rorifitness" target="_blank" rel="noreferrer">
                <Facebook size={14} />
                facebook.com/rorifitness
              </a>
              <a href="https://www.instagram.com/rori_fitness" target="_blank" rel="noreferrer">
                <Instagram size={14} />
                instagram.com/rori_fitness
              </a>
              <a href="https://www.rorifit.com" target="_blank" rel="noreferrer">
                <Globe size={14} />
                www.rorifit.com
              </a>
            </div>
            {contacts.notes ? (
              <p className={styles.notes}>{contacts.notes}</p>
            ) : null}
          </>
        )}
      </section>
    </PageStack>
  );
}
