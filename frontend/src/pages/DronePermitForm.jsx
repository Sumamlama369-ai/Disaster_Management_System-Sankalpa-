import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { permitService } from '../services/permit';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';

export default function DronePermitForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    // Drone specs
    manufacturer: '',
    model: '',
    serial_number: '',
    manufactured_year: '',
    drone_type: '',
    max_payload: '',
    color: '',
    retailer_name: '',

    // Operator
    registration_type: 'individual',
    full_name: '',
    citizenship_passport_no: '',
    date_of_birth: '',
    phone_number: '',
    email_address: user?.email || '',
    username: '',

    // Address
    country: 'Nepal',
    province: '',
    district: '',
    municipality: '',
    ward_no: '',

    // Agreement
    agrees_to_rules: false,
  });

  // Files
  const [files, setFiles] = useState({
    purpose_letter: null,
    purchase_bill: null,
    drone_image: null,
    citizenship_doc: null,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;
    setFiles({
      ...files,
      [name]: selectedFiles[0],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate files
    if (!files.purpose_letter || !files.purchase_bill || !files.drone_image || !files.citizenship_doc) {
      toast.error('Please upload all required documents');
      return;
    }

    if (!formData.agrees_to_rules) {
      toast.error('Please agree to the rules and regulations');
      return;
    }

    setLoading(true);

    try {
      // Create FormData
      const submitData = new FormData();

      // Append form fields
      Object.keys(formData).forEach((key) => {
        submitData.append(key, formData[key]);
      });

      // Append files
      submitData.append('purpose_letter', files.purpose_letter);
      submitData.append('purchase_bill', files.purchase_bill);
      submitData.append('drone_image', files.drone_image);
      submitData.append('citizenship_doc', files.citizenship_doc);

      await permitService.submitPermit(submitData);

      toast.success('Permit request submitted successfully!');
      navigate('/my-permits');
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error.response?.data?.detail || 'Failed to submit permit request');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <Navbar />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🚁 Emergency Drone Permit Application
          </h1>
          <p className="text-gray-600">
            Fill in all required information to request a drone operation permit
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    currentStep >= step
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step}
                </div>
                {step < 4 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      currentStep > step ? 'bg-blue-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>Drone Info</span>
            <span>Operator</span>
            <span>Address</span>
            <span>Documents</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-lg p-8"
          >
            {/* Step 1: Drone Technical Specifications */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Drone Technical Specifications
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Manufacturer *
                    </label>
                    <input
                      type="text"
                      name="manufacturer"
                      value={formData.manufacturer}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., DJI, Parrot"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Model *
                    </label>
                    <input
                      type="text"
                      name="model"
                      value={formData.model}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Mavic 3, Phantom 4"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Serial Number *
                    </label>
                    <input
                      type="text"
                      name="serial_number"
                      value={formData.serial_number}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Manufactured Year *
                    </label>
                    <input
                      type="number"
                      name="manufactured_year"
                      value={formData.manufactured_year}
                      onChange={handleChange}
                      required
                      min="2000"
                      max={new Date().getFullYear()}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Drone Type *
                    </label>
                    <select
                      name="drone_type"
                      value={formData.drone_type}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Type</option>
                      <option value="Quadcopter">Quadcopter</option>
                      <option value="Hexacopter">Hexacopter</option>
                      <option value="Octocopter">Octocopter</option>
                      <option value="Fixed-wing">Fixed-wing</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Payload (kg) *
                    </label>
                    <input
                      type="number"
                      name="max_payload"
                      value={formData.max_payload}
                      onChange={handleChange}
                      required
                      step="0.1"
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color *
                    </label>
                    <input
                      type="text"
                      name="color"
                      value={formData.color}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Retailer/Dealer Name *
                    </label>
                    <input
                      type="text"
                      name="retailer_name"
                      value={formData.retailer_name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Operator Information */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Operator Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Registration Type *
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="registration_type"
                          value="individual"
                          checked={formData.registration_type === 'individual'}
                          onChange={handleChange}
                          className="mr-2"
                        />
                        Individual
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="registration_type"
                          value="company"
                          checked={formData.registration_type === 'company'}
                          onChange={handleChange}
                          className="mr-2"
                        />
                        Company
                      </label>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Citizenship/Passport No *
                    </label>
                    <input
                      type="text"
                      name="citizenship_passport_no"
                      value={formData.citizenship_passport_no}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      name="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email_address"
                      value={formData.email_address}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username *
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Address Information */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Address Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country *
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Province/State *
                    </label>
                    <select
                      name="province"
                      value={formData.province}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Province</option>
                      <option value="Koshi">Koshi Province</option>
                      <option value="Madhesh">Madhesh Province</option>
                      <option value="Bagmati">Bagmati Province</option>
                      <option value="Gandaki">Gandaki Province</option>
                      <option value="Lumbini">Lumbini Province</option>
                      <option value="Karnali">Karnali Province</option>
                      <option value="Sudurpashchim">Sudurpashchim Province</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      District *
                    </label>
                    <input
                      type="text"
                      name="district"
                      value={formData.district}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Municipality *
                    </label>
                    <input
                      type="text"
                      name="municipality"
                      value={formData.municipality}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ward No *
                    </label>
                    <input
                      type="text"
                      name="ward_no"
                      value={formData.ward_no}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Documents Upload */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Required Documents
                </h2>

                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Purpose Letter (PDF) *
                    </label>
                    <input
                      type="file"
                      name="purpose_letter"
                      accept=".pdf"
                      onChange={handleFileChange}
                      required
                      className="w-full"
                    />
                    {files.purpose_letter && (
                      <p className="text-sm text-green-600 mt-2">
                        ✓ {files.purpose_letter.name}
                      </p>
                    )}
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Purchase Bill (PDF) *
                    </label>
                    <input
                      type="file"
                      name="purchase_bill"
                      accept=".pdf"
                      onChange={handleFileChange}
                      required
                      className="w-full"
                    />
                    {files.purchase_bill && (
                      <p className="text-sm text-green-600 mt-2">
                        ✓ {files.purchase_bill.name}
                      </p>
                    )}
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Drone Image (JPG/PNG) *
                    </label>
                    <input
                      type="file"
                      name="drone_image"
                      accept="image/*"
                      onChange={handleFileChange}
                      required
                      className="w-full"
                    />
                    {files.drone_image && (
                      <p className="text-sm text-green-600 mt-2">
                        ✓ {files.drone_image.name}
                      </p>
                    )}
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Citizenship Document (PDF) *
                    </label>
                    <input
                      type="file"
                      name="citizenship_doc"
                      accept=".pdf"
                      onChange={handleFileChange}
                      required
                      className="w-full"
                    />
                    {files.citizenship_doc && (
                      <p className="text-sm text-green-600 mt-2">
                        ✓ {files.citizenship_doc.name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="agrees_to_rules"
                      checked={formData.agrees_to_rules}
                      onChange={handleChange}
                      required
                      className="mt-1 mr-3"
                    />
                    <span className="text-sm text-gray-700">
                      I abide by the rules of <strong>MOHA Drone Working Procedure 2075</strong> and{' '}
                      <strong>CAAN Drone Requirement</strong>. I understand that providing false
                      information may result in legal consequences. *
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className={`px-6 py-2 rounded-lg font-medium ${
                  currentStep === 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Previous
              </button>

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-6 py-2 rounded-lg font-medium text-white ${
                    loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              )}
            </div>
          </motion.div>
        </form>
      </div>
    </div>
  );
}