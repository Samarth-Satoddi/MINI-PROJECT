import { useState } from "react";

const emptyProvider = {
  name: "",
  category: "",
  location: "",
  hourlyRate: "",
  phone: "",
  email: "",
  services: "",
  description: "",
};

function EventForm({ onAddProvider }) {
  const [formData, setFormData] = useState(emptyProvider);
  const [availability, setAvailability] = useState([
    { date: "", startTime: "", endTime: "" },
  ]);
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");

  function handleChange(event) {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  }

  function handleSlotChange(index, event) {
    setAvailability(availability.map((slot, slotIndex) => (
      slotIndex === index
        ? { ...slot, [event.target.name]: event.target.value }
        : slot
    )));
  }

  function addSlot() {
    setAvailability([...availability, { date: "", startTime: "", endTime: "" }]);
  }

  function removeSlot(index) {
    setAvailability(availability.filter((_, slotIndex) => slotIndex !== index));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setMessage("");

    if (availability.length === 0 || availability.some(slot => (
      !slot.date || !slot.startTime || !slot.endTime || slot.startTime >= slot.endTime
    ))) {
      setFormError("Add at least one valid availability time.");
      return;
    }

    try {
      await onAddProvider({
        ...formData,
        hourlyRate: Number(formData.hourlyRate),
        services: formData.services.split(",").map(service => service.trim()).filter(Boolean),
        availability,
      });
      setFormData(emptyProvider);
      setAvailability([{ date: "", startTime: "", endTime: "" }]);
      setMessage("Profile submitted. It will appear after admin verification.");
    } catch (error) {
      setFormError(error.message);
    }
  }

  return (
    <section className="provider-form-section">
      <p className="section-label">For local professionals</p>
      <h2>Create a provider profile</h2>

      <form className="provider-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Provider name</label>
          <input id="name" name="name" value={formData.name} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label htmlFor="category">Service category</label>
          <select id="category" name="category" value={formData.category} onChange={handleChange} required>
            <option value="">Choose a service</option>
            <option>Electrician</option>
            <option>Tutor</option>
            <option>Cleaner</option>
            <option>Plumber</option>
            <option>Carpenter</option>
            <option>Other</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="location">Service location</label>
          <input id="location" name="location" value={formData.location} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label htmlFor="hourlyRate">Hourly rate</label>
          <input id="hourlyRate" name="hourlyRate" type="number" min="0" value={formData.hourlyRate} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label htmlFor="phone">Phone</label>
          <input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
        </div>

        <div className="form-group full-width">
          <label htmlFor="services">Services offered</label>
          <input id="services" name="services" value={formData.services} onChange={handleChange} placeholder="Repairs, installation, maintenance" />
        </div>

        <div className="form-group full-width">
          <label htmlFor="description">Profile description</label>
          <textarea id="description" name="description" value={formData.description} onChange={handleChange} />
        </div>

        <fieldset className="availability-editor full-width">
          <legend>Availability calendar</legend>
          {availability.map((slot, index) => (
            <div className="availability-row" key={index}>
              <label>
                Date
                <input type="date" name="date" value={slot.date} onChange={event => handleSlotChange(index, event)} required />
              </label>
              <label>
                From
                <input type="time" name="startTime" value={slot.startTime} onChange={event => handleSlotChange(index, event)} required />
              </label>
              <label>
                To
                <input type="time" name="endTime" value={slot.endTime} onChange={event => handleSlotChange(index, event)} required />
              </label>
              {availability.length > 1 && (
                <button className="text-button" type="button" onClick={() => removeSlot(index)} aria-label="Remove availability time">
                  Remove
                </button>
              )}
            </div>
          ))}
          <button className="text-button" type="button" onClick={addSlot}>Add another time</button>
        </fieldset>

        {formError && <p className="form-error">{formError}</p>}
        {message && <p className="form-success">{message}</p>}
        <button className="submit-button" type="submit">Submit provider profile</button>
      </form>
    </section>
  );
}

export default EventForm;