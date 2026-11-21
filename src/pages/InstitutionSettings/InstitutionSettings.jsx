import { CalendarDays } from "lucide-react";
import { AdminPageHeader } from "../../components/admin/AdminUI";
import { useAuth } from "../../context/AuthContext";
import { InstitutionAcademicSessions } from "../InstitutionAcademicSessions/InstitutionAcademicSessions";
import "./InstitutionSettings.css";

// One card per setting: icon + title + description, then the setting's own content.
function SettingsSection({ icon: Icon, title, description, children }) {
  return (
    <section className="settings-section">
      <header className="settings-section__head">
        <span className="settings-section__icon">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="settings-section__title">{title}</h2>
          <p className="settings-section__desc">{description}</p>
        </div>
      </header>
      <div className="settings-section__body">{children}</div>
    </section>
  );
}

export function InstitutionSettings() {
  const { hasPermission } = useAuth();
  // Add a setting = one more entry here (with the permission that gates it).
  const sections = [
    {
      key: "academic-year",
      allowed: hasPermission("academicSession:read"),
      icon: CalendarDays,
      title: "Academic Year",
      description: "Manage the academic years program batches are created in",
      content: <InstitutionAcademicSessions />,
    },
  ].filter((section) => section.allowed);

  return (
    <div className="institution-settings">
      <AdminPageHeader title="System Settings" description="Configure this college's academic years and other settings." />
      {sections.map(({ key, content, allowed: _allowed, ...section }) => (
        <SettingsSection key={key} {...section}>
          {content}
        </SettingsSection>
      ))}
    </div>
  );
}
