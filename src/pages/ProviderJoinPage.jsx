import EventForm from "../components/EventForm";

function ProviderJoinPage({ onAddProvider }) {
    return (
        <main className="page-shell">
            <section className="page-heading join-heading">
                <p className="section-label">For local professionals</p>
                <h1>Offer your services nearby</h1>
                <p>Create a profile with your service area, rates, and available booking times. Profiles appear in search after verification.</p>
            </section>
            <EventForm onAddProvider={onAddProvider} />
        </main>
    );
}

export default ProviderJoinPage;