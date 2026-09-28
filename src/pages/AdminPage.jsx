import { useState } from "react";

const API_URL = "http://localhost:5000";

function AdminPage() {
    const [adminKey, setAdminKey] = useState("");
    const [providers, setProviders] = useState([]);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [isLoaded, setIsLoaded] = useState(false);

    async function loadPendingProviders(key = adminKey) {
        setError("");
        setMessage("");

        try {
            const response = await fetch(`${API_URL}/api/admin/providers`, {
                headers: { "x-admin-key": key },
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Could not load verification requests.");
            setProviders(data);
            setIsLoaded(true);
        } catch (requestError) {
            setError(requestError.message);
            setIsLoaded(false);
        }
    }

    async function updateVerification(providerId, status) {
        setError("");
        setMessage("");

        try {
            const response = await fetch(`${API_URL}/api/admin/providers/${providerId}/verification`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "x-admin-key": adminKey,
                },
                body: JSON.stringify({ status }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Verification could not be updated.");
            setMessage(`Provider ${status}.`);
            await loadPendingProviders();
        } catch (requestError) {
            setError(requestError.message);
        }
    }

    function handleSubmit(event) {
        event.preventDefault();
        loadPendingProviders();
    }

    return (
        <main className="page-shell">
            <section className="page-heading">
                <p className="section-label">Admin verification</p>
                <h1>Provider requests</h1>
                <p>Review provider profiles before they appear in local service search.</p>
            </section>

            <section className="providers-section admin-section">
                <form className="admin-key-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="adminKey">Admin API key</label>
                        <input id="adminKey" type="password" value={adminKey} onChange={event => setAdminKey(event.target.value)} required />
                    </div>
                    <button className="submit-button" type="submit">Load requests</button>
                </form>

                {error && <p className="form-error">{error}</p>}
                {message && <p className="form-success">{message}</p>}
                {isLoaded && providers.length === 0 && <p className="empty-message">No provider requests need review.</p>}

                {providers.map(provider => (
                    <article className="booking-item" key={provider._id}>
                        <div>
                            <p className="provider-category">{provider.category}</p>
                            <h2>{provider.name}</h2>
                            <p><strong>Location:</strong> {provider.location}</p>
                            <p><strong>Email:</strong> {provider.email || "Not provided"}</p>
                            <p>{provider.description}</p>
                        </div>
                        <div className="booking-actions">
                            <button className="submit-button" type="button" onClick={() => updateVerification(provider._id, "approved")}>Approve</button>
                            <button className="secondary-button" type="button" onClick={() => updateVerification(provider._id, "rejected")}>Reject</button>
                        </div>
                    </article>
                ))}
            </section>
        </main>
    );
}

export default AdminPage;