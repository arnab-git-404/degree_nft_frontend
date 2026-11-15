import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import api, { getErrorMessage } from "../../lib/api";
import { Brand } from "../../components/Brand";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { isValidPublicKey } from "../../lib/solana";
import "./Apply.css";

const EMPTY_FORM = {
  name: "",
  code: "",
  email: "",
  contactName: "",
  walletAddress: "",
  phone: "",
  website: "",
  accreditation: "",
  city: "",
  state: "",
  country: "",
};

function Notice({ icon, tone, title, children }) {
  const Icon = icon;

  return (
    <div className="notice">
      <Icon className={`notice-icon ${tone}`} />
      <div>
        <h1 className="notice-title">{title}</h1>
        <p className="notice-text">{children}</p>
      </div>
    </div>
  );
}

export function Apply() {
  const { token } = useParams();
  const [link, setLink] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | invalid | form | submitted
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api
      .get(`/registration/${encodeURIComponent(token)}`)
      .then(({ data }) => {
        if (cancelled) return;
        setLink(data.link);
        setStatus("form");
      })
      .catch(() => {
        if (!cancelled) setStatus("invalid");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const wallet = form.walletAddress.trim();
  const walletError =
    wallet && !isValidPublicKey(wallet)
      ? "Enter a valid Solana wallet address"
      : "";

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "code" ? value.toUpperCase() : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (walletError) return;
    setIsSubmitting(true);
    setError("");

    try {
      const { data } = await api.post(
        `/registration/${encodeURIComponent(token)}/apply`,
        form
      );
      setMessage(data.message);
      setStatus("submitted");
    } catch (submitError) {
      if (submitError.response?.data?.code === "REGISTRATION_LINK_INACTIVE") {
        setStatus("invalid");
      } else {
        setError(getErrorMessage(submitError, "Failed to submit application"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="apply-page">
      <header className="topbar">
        <Brand showTag={false} />
        {link?.label ? <span className="campaign">{link.label}</span> : null}
      </header>

      <div className="content">
        {status === "loading" ? (
          <div className="loading">
            <Loader2 className="h-6 w-6 animate-spin text-cobalt" />
          </div>
        ) : status === "invalid" ? (
          <Notice icon={XCircle} tone="text-red-600" title="Link not available">
            This registration link is invalid or has been deactivated. Contact
            the DegreeNFT team for a new link.
          </Notice>
        ) : status === "submitted" ? (
          <Notice
            icon={CheckCircle2}
            tone="text-green-600"
            title="Application submitted"
          >
            {message}
          </Notice>
        ) : (
          <form onSubmit={handleSubmit} className="form-card">
            <div className="form-head">
              <h1 className="form-title">Apply for institution registration</h1>
              <p className="form-sub">
                Submit your institution's details. A DegreeNFT administrator
                reviews every application before onboarding. Fields marked * are
                required.
              </p>
            </div>

            <div className="form-body">
              <fieldset className="group">
                <legend className="section-label">Institution</legend>
                <div className="span-2">
                  <Input label="Institution name *" name="name" value={form.name} onChange={handleChange} required maxLength={200} />
                </div>
                <Input label="Institution code *" name="code" value={form.code} onChange={handleChange} required maxLength={20} pattern="[A-Za-z0-9\-]{2,20}" description="2-20 letters, numbers or hyphens" />
                <Input label="Accreditation" name="accreditation" value={form.accreditation} onChange={handleChange} maxLength={200} />
                <div className="span-2">
                  <Input label="Website" name="website" type="url" placeholder="https://" value={form.website} onChange={handleChange} maxLength={200} />
                </div>
                <div className="span-2">
                  <Input
                    label="Institution Solana wallet address *"
                    name="walletAddress"
                    value={form.walletAddress}
                    onChange={handleChange}
                    required
                    maxLength={64}
                    spellCheck={false}
                    autoComplete="off"
                    className="font-mono"
                    error={walletError}
                    description="The wallet that will issue your credentials on Solana."
                  />
                </div>
              </fieldset>

              <fieldset className="group">
                <legend className="section-label">Contact</legend>
                <div className="span-2">
                  <Input label="Contact person *" name="contactName" value={form.contactName} onChange={handleChange} required maxLength={120} />
                </div>
                <Input label="Official email *" name="email" type="email" value={form.email} onChange={handleChange} required maxLength={200} />
                <Input label="Phone" name="phone" type="tel" value={form.phone} onChange={handleChange} maxLength={30} />

                <p className="section-label span-2 pt-2">Location</p>
                <Input label="City" name="city" value={form.city} onChange={handleChange} maxLength={100} />
                <Input label="State / Region" name="state" value={form.state} onChange={handleChange} maxLength={100} />
                <div className="span-2">
                  <Input label="Country" name="country" value={form.country} onChange={handleChange} maxLength={100} />
                </div>
              </fieldset>
            </div>

            {error ? (
              <p role="alert" className="form-error">
                {error}
              </p>
            ) : null}

            <div className="form-foot">
              <Button type="submit" isLoading={isSubmitting}>
                Submit application
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
