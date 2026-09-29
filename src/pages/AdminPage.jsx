import { useState, useEffect } from "react";
import { API_URL } from "../config/api";

function AdminPage() {
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem("adminKey") || "");
  const [isKeyVerified, setIsKeyVerified] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [providers, setProviders] = useState([]);
  const [activeTab, setActiveTab] = useState("pending"); // "pending" | "approved" | "rejected" | "all"
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (adminKey) {
      verifyAndLoadProviders(adminKey);
    }
  }, [adminKey]);

  async function verifyAndLoadProviders(key) {
    setLoading(true);
    setError("");
    try {
      const verifyRes = await fetch(`${API_URL}/api/admin/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": key,
        },
      });

      if (!verifyRes.ok) {
        throw new Error("Invalid Admin Key. Access denied.");
      }

      setIsKeyVerified(true);
      sessionStorage.setItem("adminKey", key);

      // Fetch all providers for admin dashboard
      const providersRes = await fetch(`${API_URL}/api/admin/providers?status=all`, {
        headers: {
          "x-admin-key": key,
        },
      });

      if (!providersRes.ok) {
        throw new Error("Failed to load providers list.");
      }

      const data = await providersRes.json();
      setProviders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Authentication failed.");
      setIsKeyVerified(false);
      sessionStorage.removeItem("adminKey");
    } finally {
      setLoading(false);
    }
  }

  function handleLogin(e) {
    e.preventDefault();
    if (!keyInput.trim()) {
      setError("Please enter the Admin API key.");
      return;
    }
    setAdminKey(keyInput.trim());
  }

  function handleLogout() {
    sessionStorage.removeItem("adminKey");
    setAdminKey("");
    setIsKeyVerified(false);
    setKeyInput("");
    setProviders([]);
    setSuccessMessage("");
  }

  async function handleUpdateStatus(providerId, status) {
    setError("");
    setSuccessMessage("");
    setActionLoadingId(providerId);

    try {
      const res = await fetch(`${API_URL}/api/admin/providers/${providerId}/verification`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Failed to set status to ${status}.`);
      }

      // Update provider in state immediately
      setProviders(prev =>
        prev.map(p =>
          p._id === providerId
            ? { ...p, verificationStatus: status, verified: status === "approved" }
            : p
        )
      );

      setSuccessMessage(
        status === "approved"
          ? `Provider "${data.provider?.name || 'Provider'}" has been approved! They are now live on public search.`
          : `Provider "${data.provider?.name || 'Provider'}" has been rejected.`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  }

  const pendingProviders = providers.filter(p => p.verificationStatus === "pending");
  const approvedProviders = providers.filter(p => p.verificationStatus === "approved");
  const rejectedProviders = providers.filter(p => p.verificationStatus === "rejected");

  function getDisplayedProviders() {
    if (activeTab === "pending") return pendingProviders;
    if (activeTab === "approved") return approvedProviders;
    if (activeTab === "rejected") return rejectedProviders;
    return providers;
  }

  const displayedProviders = getDisplayedProviders();

  // If not authenticated as Admin, show login screen
  if (!isKeyVerified) {
    return (
      <main className="page-shell">
        <section className="page-heading">
          <p className="section-label">Restricted Area</p>
          <h1>Admin Portal Authentication</h1>
          <p>Please enter the administrative key to access the Provider Verification Dashboard.</p>
        </section>

        <section className="provider-form-section auth-form-section" style={{ maxWidth: "450px", margin: "0 auto" }}>
          <form className="provider-form" onSubmit={handleLogin}>
            {error && <p className="form-error banner-message">{error}</p>}
            <div className="form-group">
              <label htmlFor="admin-key-input">Admin API Key</label>
              <input
                id="admin-key-input"
                type="password"
                required
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                placeholder="Enter admin key"
                autoFocus
              />
            </div>
            <button className="submit-button" type="submit" disabled={loading} style={{ width: "100%", marginTop: "10px" }}>
              {loading ? "Authenticating..." : "🔓 Unlock Admin Portal"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="page-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <p className="section-label">Admin Management</p>
          <h1>Provider Approval Dashboard</h1>
          <p>Review, approve, and manage service provider registrations and public listing availability.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            className="secondary-button"
            onClick={() => verifyAndLoadProviders(adminKey)}
            disabled={loading}
          >
            🔄 Refresh
          </button>
          <button
            type="button"
            className="secondary-button"
            style={{ color: "#ef4444", borderColor: "#ef4444" }}
            onClick={handleLogout}
          >
            🔒 Exit Admin
          </button>
        </div>
      </section>

      {error && <p className="form-error banner-message">{error}</p>}
      {successMessage && <p className="form-success banner-message">{successMessage}</p>}

      {/* METRIC CARDS */}
      <section className="admin-stats-grid" style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "16px",
        marginBottom: "24px"
      }}>
        <div
          onClick={() => setActiveTab("pending")}
          style={{
            background: activeTab === "pending" ? "var(--surface-soft)" : "var(--surface)",
            padding: "18px",
            borderRadius: "8px",
            border: activeTab === "pending" ? "2px solid #f59e0b" : "1px solid var(--border)",
            cursor: "pointer",
            boxShadow: "var(--shadow)"
          }}
        >
          <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", fontWeight: "600" }}>Pending Applications</p>
          <h2 style={{ margin: "8px 0 0", fontSize: "28px", color: "#f59e0b" }}>{pendingProviders.length}</h2>
          <small style={{ color: "var(--text-muted)" }}>Requires admin review</small>
        </div>

        <div
          onClick={() => setActiveTab("approved")}
          style={{
            background: activeTab === "approved" ? "var(--surface-soft)" : "var(--surface)",
            padding: "18px",
            borderRadius: "8px",
            border: activeTab === "approved" ? "2px solid var(--primary)" : "1px solid var(--border)",
            cursor: "pointer",
            boxShadow: "var(--shadow)"
          }}
        >
          <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", fontWeight: "600" }}>Approved Providers</p>
          <h2 style={{ margin: "8px 0 0", fontSize: "28px", color: "var(--primary)" }}>{approvedProviders.length}</h2>
          <small style={{ color: "var(--text-muted)" }}>Visible in public discovery</small>
        </div>

        <div
          onClick={() => setActiveTab("rejected")}
          style={{
            background: activeTab === "rejected" ? "var(--surface-soft)" : "var(--surface)",
            padding: "18px",
            borderRadius: "8px",
            border: activeTab === "rejected" ? "2px solid #ef4444" : "1px solid var(--border)",
            cursor: "pointer",
            boxShadow: "var(--shadow)"
          }}
        >
          <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", fontWeight: "600" }}>Rejected Providers</p>
          <h2 style={{ margin: "8px 0 0", fontSize: "28px", color: "#ef4444" }}>{rejectedProviders.length}</h2>
          <small style={{ color: "var(--text-muted)" }}>Hidden from search</small>
        </div>

        <div
          onClick={() => setActiveTab("all")}
          style={{
            background: activeTab === "all" ? "var(--surface-soft)" : "var(--surface)",
            padding: "18px",
            borderRadius: "8px",
            border: activeTab === "all" ? "2px solid var(--primary-dark)" : "1px solid var(--border)",
            cursor: "pointer",
            boxShadow: "var(--shadow)"
          }}
        >
          <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", fontWeight: "600" }}>Total Providers</p>
          <h2 style={{ margin: "8px 0 0", fontSize: "28px", color: "var(--text)" }}>{providers.length}</h2>
          <small style={{ color: "var(--text-muted)" }}>All registered entries</small>
        </div>
      </section>

      {/* FILTER TABS */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
        <button
          type="button"
          className={activeTab === "pending" ? "submit-button" : "secondary-button"}
          onClick={() => setActiveTab("pending")}
          style={{ padding: "8px 16px" }}
        >
          ⏳ Pending Applications ({pendingProviders.length})
        </button>
        <button
          type="button"
          className={activeTab === "approved" ? "submit-button" : "secondary-button"}
          onClick={() => setActiveTab("approved")}
          style={{ padding: "8px 16px" }}
        >
          ✓ Approved Providers ({approvedProviders.length})
        </button>
        <button
          type="button"
          className={activeTab === "rejected" ? "submit-button" : "secondary-button"}
          onClick={() => setActiveTab("rejected")}
          style={{ padding: "8px 16px" }}
        >
          ✕ Rejected Providers ({rejectedProviders.length})
        </button>
        <button
          type="button"
          className={activeTab === "all" ? "submit-button" : "secondary-button"}
          onClick={() => setActiveTab("all")}
          style={{ padding: "8px 16px" }}
        >
          All Providers ({providers.length})
        </button>
      </div>

      {/* PROVIDER LIST */}
      <section className="profile-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <p className="section-label">Application Records</p>
            <h2 style={{ margin: 0 }}>
              {activeTab === "pending" && "Pending Provider Applications"}
              {activeTab === "approved" && "Approved Providers"}
              {activeTab === "rejected" && "Rejected Providers"}
              {activeTab === "all" && "All Provider Records"}
              {" "}({displayedProviders.length})
            </h2>
          </div>
        </div>

        {loading ? (
          <p className="empty-message">Loading provider records...</p>
        ) : displayedProviders.length === 0 ? (
          <p className="empty-message">
            {activeTab === "pending"
              ? "No pending provider applications to review."
              : `No ${activeTab} providers found.`}
          </p>
        ) : (
          <div style={{ display: "grid", gap: "20px" }}>
            {displayedProviders.map(p => {
              const regDate = p.createdAt
                ? new Date(p.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                : (p._id ? new Date(parseInt(p._id.toString().substring(0, 8), 16) * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "N/A");

              const isPending = p.verificationStatus === "pending";
              const isApproved = p.verificationStatus === "approved";
              const isRejected = p.verificationStatus === "rejected";

              return (
                <article
                  key={p._id}
                  style={{
                    background: "var(--surface)",
                    borderRadius: "8px",
                    border: isPending ? "2px solid #f59e0b" : "1px solid var(--border)",
                    padding: "22px",
                    boxShadow: "var(--shadow)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <h3 style={{ margin: 0, fontSize: "20px" }}>{p.name}</h3>
                        <span style={{
                          padding: "4px 10px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          background: isApproved ? "#dcfce7" : (isPending ? "#fef3c7" : "#fee2e2"),
                          color: isApproved ? "#15803d" : (isPending ? "#b45309" : "#b91c1c")
                        }}>
                          {isApproved && "Approved"}
                          {isPending && "Pending Review"}
                          {isRejected && "Rejected"}
                        </span>
                      </div>
                      <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "14px" }}>
                        Category: <strong>{p.category}</strong> · Rate: <strong>₹{p.hourlyRate}/hr</strong>
                      </p>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                      {isPending && (
                        <>
                          <button
                            type="button"
                            className="submit-button"
                            style={{ background: "#16a34a", padding: "8px 16px" }}
                            disabled={actionLoadingId === p._id}
                            onClick={() => handleUpdateStatus(p._id, "approved")}
                          >
                            ✓ Approve
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            style={{ color: "#ef4444", borderColor: "#ef4444", padding: "8px 16px" }}
                            disabled={actionLoadingId === p._id}
                            onClick={() => handleUpdateStatus(p._id, "rejected")}
                          >
                            ✕ Reject
                          </button>
                        </>
                      )}

                      {isApproved && (
                        <>
                          <span style={{ color: "#16a34a", fontWeight: "700", fontSize: "14px", marginRight: "6px" }}>
                            ✓ Active & Verified
                          </span>
                          <button
                            type="button"
                            className="secondary-button"
                            style={{ color: "#ef4444", borderColor: "#ef4444", padding: "6px 12px", fontSize: "13px" }}
                            disabled={actionLoadingId === p._id}
                            onClick={() => handleUpdateStatus(p._id, "rejected")}
                          >
                            Revoke / Reject
                          </button>
                        </>
                      )}

                      {isRejected && (
                        <>
                          <span style={{ color: "#ef4444", fontWeight: "700", fontSize: "14px", marginRight: "6px" }}>
                            ✕ Application Rejected
                          </span>
                          <button
                            type="button"
                            className="submit-button"
                            style={{ background: "#16a34a", padding: "6px 12px", fontSize: "13px" }}
                            disabled={actionLoadingId === p._id}
                            onClick={() => handleUpdateStatus(p._id, "approved")}
                          >
                            Re-Approve
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* DETAILS GRID */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "10px",
                    background: "var(--surface-soft)",
                    padding: "14px",
                    borderRadius: "6px",
                    fontSize: "14px"
                  }}>
                    <div>
                      <strong>Email:</strong> {p.email || "N/A"}
                    </div>
                    <div>
                      <strong>Phone:</strong> {p.phone || "N/A"}
                    </div>
                    <div>
                      <strong>City / Location:</strong> {p.location || "N/A"}
                    </div>
                    <div>
                      <strong>State:</strong> {p.state || (p.location?.includes(",") ? p.location.split(",")[1]?.trim() : "India")}
                    </div>
                    <div>
                      <strong>Hourly Rate:</strong> ₹{p.hourlyRate}/hr
                    </div>
                    <div>
                      <strong>Registration Date:</strong> {regDate}
                    </div>
                    <div>
                      <strong>Verification Status:</strong> {p.verificationStatus || "pending"}
                    </div>
                  </div>

                  {/* SERVICES */}
                  {Array.isArray(p.services) && p.services.length > 0 && (
                    <div>
                      <strong style={{ fontSize: "13px", color: "var(--text-muted)" }}>Services Offered:</strong>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                        {p.services.map((svc, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: "var(--surface-soft)",
                              padding: "3px 8px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              border: "1px solid var(--border)"
                            }}
                          >
                            {svc}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* BIO */}
                  {p.description && (
                    <div style={{ fontSize: "14px", color: "var(--text)" }}>
                      <strong style={{ fontSize: "13px", color: "var(--text-muted)" }}>Bio / Description:</strong>
                      <p style={{ margin: "4px 0 0", lineHeight: "1.4" }}>{p.description}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

export default AdminPage;
