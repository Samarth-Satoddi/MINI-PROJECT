import { useState } from "react";
import EventForm from "../components/EventForm";

function ProviderJoinPage({
    providers = [],
    onAddProvider,
    onUpdateProvider,
    onDeleteProvider,
}) {
    const [editingProvider, setEditingProvider] = useState(null);
    const [actionMessage, setActionMessage] = useState("");
    const [actionError, setActionError] = useState("");

    function handleStartEdit(provider) {
        setEditingProvider(provider);
        setActionMessage(`Editing provider: ${provider.name}`);
        setActionError("");
        const formElement = document.getElementById("provider-form");
        if (formElement) {
            formElement.scrollIntoView({ behavior: "smooth" });
        }
    }

    function handleCancelEdit() {
        setEditingProvider(null);
        setActionMessage("");
        setActionError("");
    }

    async function handleDelete(provider) {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${provider.name}"? This will also remove their bookings and reviews.`
        );
        if (!confirmed) return;

        setActionMessage("");
        setActionError("");

        try {
            if (onDeleteProvider) {
                await onDeleteProvider(provider._id);
                setActionMessage(`Provider "${provider.name}" has been deleted.`);
                if (editingProvider && editingProvider._id === provider._id) {
                    setEditingProvider(null);
                }
            }
        } catch (error) {
            setActionError(error.message || "Failed to delete provider.");
        }
    }

    return (
        <main className="page-shell">
            <section className="page-heading join-heading">
                <p className="section-label">For local professionals</p>
                <h1>Offer your services nearby</h1>
                <p>
                    Create, update, or manage your service provider profile, rates, and availability times.
                </p>
            </section>

            {actionMessage && <p className="form-success banner-message">{actionMessage}</p>}
            {actionError && <p className="form-error banner-message">{actionError}</p>}

            <EventForm
                onAddProvider={onAddProvider}
                onUpdateProvider={onUpdateProvider}
                editingProvider={editingProvider}
                onCancelEdit={handleCancelEdit}
            />

            <section className="profile-section manage-providers-section">
                <p className="section-label">Manage listings</p>
                <h2>Current registered providers ({providers.length})</h2>

                {providers.length === 0 ? (
                    <p className="empty-message">No providers currently registered.</p>
                ) : (
                    <div className="manage-provider-grid">
                        {providers.map(provider => (
                            <article className="manage-provider-card" key={provider._id}>
                                <div className="manage-provider-header">
                                    <span className="provider-category">{provider.category}</span>
                                    <span className="provider-rate">${provider.hourlyRate}/hr</span>
                                </div>

                                <h3>{provider.name}</h3>
                                <p className="manage-location">📍 {provider.location}</p>

                                {provider.phone && <p className="manage-meta">📞 {provider.phone}</p>}
                                {provider.email && <p className="manage-meta">✉️ {provider.email}</p>}

                                {provider.services?.length > 0 && (
                                    <p className="manage-services">
                                        <strong>Services:</strong> {provider.services.join(", ")}
                                    </p>
                                )}

                                <div className="manage-card-actions">
                                    <button
                                        type="button"
                                        className="edit-provider-btn"
                                        onClick={() => handleStartEdit(provider)}
                                    >
                                        ✏️ Update Provider
                                    </button>
                                    <button
                                        type="button"
                                        className="delete-provider-btn"
                                        onClick={() => handleDelete(provider)}
                                    >
                                        🗑️ Delete
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}

export default ProviderJoinPage;