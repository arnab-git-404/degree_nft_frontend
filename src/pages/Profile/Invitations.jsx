import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/Button";

// College invitations for an existing account (new accounts accept by opening their activation link).
export function Invitations() {
  const { refreshUser, selectInstitution } = useAuth();
  const [invitations, setInvitations] = useState([]);
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    api
      .get("/memberships/invitations")
      .then(({ data }) => setInvitations(data.invitations))
      .catch(() => setInvitations([]));
  }, []);

  if (invitations.length === 0) return null;

  const respond = async (invitation, accept) => {
    setBusyId(invitation._id);

    try {
      await api.post(`/memberships/${invitation._id}/${accept ? "accept" : "decline"}`);
      setInvitations((current) => current.filter((item) => item._id !== invitation._id));

      if (accept) {
        await refreshUser();
        selectInstitution(invitation.institutionId._id);
        toast.success(`You joined ${invitation.institutionId.name}`);
      } else {
        toast.success("Invitation declined");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to answer the invitation"));
    } finally {
      setBusyId("");
    }
  };

  return (
    <section className="card invitations">
      <div className="card-head">
        <h2 className="card-title">College invitations</h2>
        <p className="card-sub">Accepting gives you this role in that college only.</p>
      </div>
      <ul className="card-body">
        {invitations.map((invitation) => (
          <li key={invitation._id} className="invitation">
            <Building2 className="h-4 w-4 shrink-0 text-cobalt" />
            <p className="invitation-text">
              <strong>{invitation.institutionId?.name}</strong> ({invitation.institutionId?.code}) invited you as{" "}
              <strong>{invitation.roleId?.displayName}</strong>
              {invitation.invitedBy?.name ? ` · by ${invitation.invitedBy.name}` : ""}
            </p>
            <Button size="sm" disabled={busyId === invitation._id} onClick={() => respond(invitation, true)}>
              Accept
            </Button>
            <Button size="sm" variant="ghost" disabled={busyId === invitation._id} onClick={() => respond(invitation, false)}>
              Decline
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
