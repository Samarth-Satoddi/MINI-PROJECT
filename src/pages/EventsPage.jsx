import EventSection from "../components/EventSection";

function EventsPage({ providers }) {
    return (
        <>
            <section className="page-heading">
                <p className="section-label">
                    Local professionals
                </p>

                <h1>Find a service provider</h1>

                <p>
                    Browse verified providers by service and location, then open a profile to see ratings and available booking times.
                </p>
            </section>

            <EventSection providers={providers} title="All service providers" />
        </>
    );
}

export default EventsPage;

