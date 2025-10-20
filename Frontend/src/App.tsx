import { useEffect, useState } from "react";
import "./App.css";

interface Email {
  id: string;
  accountId: string;
  folder: string;
  subject: string;
  body: string;
  from: string;
  to: string[];
  date: string;
  aiCategory: string;
  indexedAt: string;
}

interface Account {
  id: string;
  name: string;
}

interface SuggestedReply {
  emailId: string;
  suggestedReply: string;
  confidence: number;
  context: Array<{
    category: string;
    score: number;
  }>;
}

interface EmailFormData {
  accountId: string;
  folder: string;
  subject: string;
  body: string;
  from: string;
  to: string[];
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
}

function App() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // RAG state
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [suggestedReply, setSuggestedReply] = useState<SuggestedReply | null>(null);
  const [generatingReply, setGeneratingReply] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // CRUD Operations State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showEmailDetails, setShowEmailDetails] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [emailForm, setEmailForm] = useState<EmailFormData>({
    accountId: "",
    folder: "INBOX",
    subject: "",
    body: "",
    from: "",
    to: []
  });
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0
  });
  const [isEditing, setIsEditing] = useState(false);

  const folders = ["INBOX", "Sent", "Drafts", "Spam"];
  const categories = ["All", "Interested", "Meeting Booked", "Not Interested", "Spam", "Out of Office", "Uncategorized"];

  // Fetch accounts on mount
  useEffect(() => {
    fetchAccounts();
    fetchAllEmails();
  }, []);

  async function fetchAccounts() {
    try {
      const res = await fetch("http://localhost:3000/api/accounts");
      const data = await res.json();
      setAccounts(data);
      if (data.length > 0) setSelectedAccount(data[0].id);
    } catch (err) {
      console.error("Failed to fetch accounts:", err);
    }
  }

  async function fetchAllEmails(page = 1, limit = 10) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`http://localhost:3000/api/emails?page=${page}&limit=${limit}`);
      const data = await res.json();
      setEmails(data.emails || []);
      setPagination({
        page: data.page || page,
        limit: data.limit || limit,
        total: data.total || 0
      });
    } catch (err) {
      setError("Failed to fetch emails");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function searchEmails() {
    if (!searchQuery.trim() || !selectedAccount) {
      alert("Please enter a search query and select an account");
      return;
    }

    setLoading(true);
    setError("");
    try {
      let url = `http://localhost:3000/api/emails/search?q=${encodeURIComponent(searchQuery)}&accountId=${selectedAccount}`;
      if (selectedFolder) {
        url += `&folder=${selectedFolder}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      setEmails(data);
    } catch (err) {
      setError("Search failed");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      searchEmails();
    }
  }

  function getCategoryColor(category: string) {
    const colors: Record<string, string> = {
      Interested: "bg-green-500",
      "Meeting Booked": "bg-blue-500",
      "Not Interested": "bg-red-500",
      Spam: "bg-orange-500",
      "Out of Office": "bg-purple-500",
      Uncategorized: "bg-gray-500",
    };
    return colors[category] || "bg-gray-500";
  }

 

  async function handleSuggestReply(emailId: string) {
    setGeneratingReply(true);
    setShowReplyModal(true);
    setSuggestedReply(null);

    try {
      const res = await fetch(`http://localhost:3000/api/emails/${emailId}/suggest-reply`, {
        method: "POST",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to generate reply");
      }

      const data = await res.json();
      setSuggestedReply(data);
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Suggest reply error:", error);
      alert(error.message || "Failed to generate suggested reply. Please try again.");
      setShowReplyModal(false);
    } finally {
      setGeneratingReply(false);
    }
  }

  function closeReplyModal() {
    setShowReplyModal(false);
    setSuggestedReply(null);
  }

  // CRUD Operations
  async function createEmail(emailData: EmailFormData) {
    try {
      const res = await fetch("http://localhost:3000/api/emails/index", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create email");
      }

      const result = await res.json();
      alert("Email created successfully!");
      setShowEmailModal(false);
      resetEmailForm();
      fetchAllEmails(pagination.page, pagination.limit);
      return result;
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Create email error:", error);
      alert(error.message || "Failed to create email");
    }
  }

  function resetEmailForm() {
    setEmailForm({
      accountId: "",
      folder: "INBOX",
      subject: "",
      body: "",
      from: "",
      to: []
    });
    setIsEditing(false);
  }

  function openEmailModal(email?: Email) {
    if (email) {
      setEmailForm({
        accountId: email.accountId,
        folder: email.folder,
        subject: email.subject,
        body: email.body,
        from: email.from,
        to: email.to
      });
      setIsEditing(true);
    } else {
      resetEmailForm();
    }
    setShowEmailModal(true);
  }

  function openEmailDetails(email: Email) {
    setSelectedEmail(email);
    setShowEmailDetails(true);
  }

  function closeEmailModal() {
    setShowEmailModal(false);
    resetEmailForm();
  }

  function closeEmailDetails() {
    setShowEmailDetails(false);
    setSelectedEmail(null);
  }

  function handlePageChange(newPage: number) {
    fetchAllEmails(newPage, pagination.limit);
  }

  function handleLimitChange(newLimit: number) {
    fetchAllEmails(1, newLimit);
  }

  const filteredEmails = emails.filter((email) => {
    if (selectedCategory && selectedCategory !== "All" && email.aiCategory !== selectedCategory) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2]">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20 py-8 px-4 mb-8">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
            📧 OneBox Email Dashboard
          </h1>
          <p className="text-lg text-white/90">AI-Powered Email Management System</p>
        </div>
      </header>

      <div className="w-full">
        {/* Filters Section */}
        <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6 lg:mb-8 mx-2 sm:mx-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* Search Input */}
            <div className="lg:col-span-4 flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">Search Emails</label>
              <input
                type="text"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base transition-all focus:outline-none focus:border-[#667eea] focus:ring-4 focus:ring-[#667eea]/10 text-black bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search by subject or body..."
              />
            </div>

            {/* Account Dropdown */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">👤 Account</label>
              <select
                className="px-4 py-3 border-2 border-gray-200 rounded-lg text-base transition-all focus:outline-none focus:border-[#667eea] focus:ring-4 focus:ring-[#667eea]/10 cursor-pointer text-black bg-white"
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
              >
                <option value="">Select Account</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Folder Dropdown */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">📁 Folder</label>
              <select
                className="px-4 py-3 border-2 border-gray-200 rounded-lg text-base transition-all focus:outline-none focus:border-[#667eea] focus:ring-4 focus:ring-[#667eea]/10 cursor-pointer text-black bg-white"
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
              >
                <option value="">All Folders</option>
                {folders.map((folder) => (
                  <option key={folder} value={folder}>
                    {folder}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">🏷️ Category</label>
              <select
                className="px-4 py-3 border-2 border-gray-200 rounded-lg text-base transition-all focus:outline-none focus:border-[#667eea] focus:ring-4 focus:ring-[#667eea]/10 cursor-pointer text-black bg-white"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col md:flex-row gap-4">
            <button
              className="flex-1 md:flex-none px-8 py-3 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white rounded-lg font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              onClick={searchEmails}
              disabled={loading}
            >
              {loading ? "Searching..." : "Search"}
            </button>
            
            <button
              className="flex-1 md:flex-none px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all inline-flex items-center justify-center gap-2"
              onClick={() => openEmailModal()}
            >
              Create Email
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 text-red-800 px-4 py-3 rounded-lg mb-4 border-l-4 border-red-600 mx-2 sm:mx-4">
             {error}
          </div>
        )}

        {/* Email Count and Pagination Controls */}
        <div className="bg-white rounded-lg mb-4 mx-2 sm:mx-4">
          <div className="px-4 py-3 text-center text-lg text-gray-700 border-b border-gray-200">
            Found <strong>{filteredEmails.length}</strong> email(s) 
            {pagination.total > 0 && (
              <span className="text-sm text-gray-500 ml-2">
                (Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)})
              </span>
            )}
          </div>
          
          {/* Pagination Controls */}
          {pagination.total > pagination.limit && (
            <div className="px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Show:</label>
                <select
                  value={pagination.limit}
                  onChange={(e) => handleLimitChange(Number(e.target.value))}
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-sm text-gray-500">per page</span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  ← Previous
                </button>
                
                <span className="px-3 py-1 bg-[#667eea] text-white rounded text-sm">
                  {pagination.page}
                </span>
                
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl p-16 text-center mx-2 sm:mx-4">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-[#667eea] rounded-full animate-spin-custom mx-auto mb-4"></div>
            <p>Loading emails...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredEmails.length === 0 && (
          <div className="bg-white rounded-2xl p-16 text-center mx-2 sm:mx-4">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-2xl text-gray-700 mb-2">No emails found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        )}

        {/* Emails List */}
        <div className="flex flex-col gap-4 mx-2 sm:mx-4 pb-8">
          {filteredEmails.map((email) => (
            <div
              key={email.id}
              className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all border-l-4 border-gray-200"
            >
              {/* Email Header */}
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{email.subject}</h3>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span className="font-medium">From: {email.from}</span>
                    <span className="text-gray-400">
                      {new Date(email.date).toLocaleDateString()} {new Date(email.date).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-white font-semibold text-sm whitespace-nowrap shadow-md ${getCategoryColor(email.aiCategory)}`}
                >
                  <span>{email.aiCategory}</span>
                </div>
              </div>

              {/* Email Body */}
              <p className="text-gray-600 leading-relaxed mb-4 text-base">
                {email.body.slice(0, 200)}{email.body.length > 200 ? "..." : ""}
              </p>

              {/* Email Footer */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-4 border-t border-gray-200">
                <div className="flex gap-2 flex-wrap">
                  <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-xl text-sm font-medium">
                    📁 {email.folder}
                  </span>
                  <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-xl text-sm font-medium">
                    👤 {email.accountId}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button 
                    className="px-3 py-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white rounded-lg font-semibold hover:shadow-lg transition-all text-sm"
                    onClick={() => handleSuggestReply(email.id)}
                  >
                    ✨ Suggest Reply
                  </button>
                  <button 
                    className="px-3 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-all text-sm"
                    onClick={() => openEmailDetails(email)}
                  >
                     View Details
                  </button>
                  <button 
                    className="px-3 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-all text-sm"
                    onClick={() => openEmailModal(email)}
                  >
                     Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Reply Modal */}
        {showReplyModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white px-6 py-4 rounded-t-2xl flex justify-between items-center">
                <h2 className="text-2xl font-bold">✨ AI-Suggested Reply</h2>
                <button 
                  onClick={closeReplyModal}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-all"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                {generatingReply && (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-gray-200 border-t-[#667eea] rounded-full animate-spin-custom mx-auto mb-4"></div>
                    <p className="text-gray-600 text-lg">Generating suggested reply...</p>
                    <p className="text-gray-400 text-sm mt-2">This may take a few seconds</p>
                  </div>
                )}

                {!generatingReply && suggestedReply && (
                  <div>
                    {/* Confidence Score */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700">Confidence Score:</span>
                        <span className="text-2xl font-bold text-[#667eea]">{suggestedReply.confidence}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-[#667eea] to-[#764ba2] h-2 rounded-full transition-all"
                          style={{ width: `${suggestedReply.confidence}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Context Used */}
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">📚 Context Sources:</h3>
                      <div className="flex flex-wrap gap-2">
                        {suggestedReply.context.map((ctx, idx) => (
                          <span 
                            key={idx}
                            className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium"
                          >
                            {ctx.category} ({Math.round(ctx.score * 100)}%)
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Suggested Reply Text */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">💬 Suggested Reply:</h3>
                      <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                        <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">
                          {suggestedReply.suggestedReply}
                        </pre>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-6">
                      <button className="flex-1 px-6 py-3 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white rounded-lg font-semibold hover:shadow-lg transition-all">
                         Copy to Clipboard
                      </button>
                      <button className="flex-1 px-6 py-3 bg-white text-[#667eea] border-2 border-[#667eea] rounded-lg font-semibold hover:bg-[#667eea] hover:text-white transition-all">
                         Edit & Send
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Email Create/Edit Modal */}
        {showEmailModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center">
                <h2 className="text-2xl font-bold">
                  {isEditing ? " Edit Email" : " Create New Email"}
                </h2>
                <button 
                  onClick={closeEmailModal}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-all"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                <form onSubmit={(e) => {
                  e.preventDefault();
                  createEmail(emailForm);
                }} className="space-y-4">
                  {/* Account Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Account *</label>
                    <select
                      value={emailForm.accountId}
                      onChange={(e) => setEmailForm({...emailForm, accountId: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                      required
                    >
                      <option value="">Select Account</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Folder Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Folder</label>
                    <select
                      value={emailForm.folder}
                      onChange={(e) => setEmailForm({...emailForm, folder: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                    >
                      {folders.map((folder) => (
                        <option key={folder} value={folder}>{folder}</option>
                      ))}
                    </select>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Subject *</label>
                    <input
                      type="text"
                      value={emailForm.subject}
                      onChange={(e) => setEmailForm({...emailForm, subject: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                      placeholder="Email subject"
                      required
                    />
                  </div>

                  {/* From */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">From *</label>
                    <input
                      type="email"
                      value={emailForm.from}
                      onChange={(e) => setEmailForm({...emailForm, from: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                      placeholder="sender@example.com"
                      required
                    />
                  </div>

                  {/* To */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">To</label>
                    <input
                      type="text"
                      value={emailForm.to.join(", ")}
                      onChange={(e) => setEmailForm({...emailForm, to: e.target.value.split(",").map(t => t.trim()).filter(t => t)})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                      placeholder="recipient1@example.com, recipient2@example.com"
                    />
                  </div>

                  {/* Body */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Body *</label>
                    <textarea
                      value={emailForm.body}
                      onChange={(e) => setEmailForm({...emailForm, body: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 h-32"
                      placeholder="Email content"
                      required
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={closeEmailModal}
                      className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                    >
                      {isEditing ? "Update Email" : "Create Email"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Email Details Modal */}
        {showEmailDetails && selectedEmail && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center">
                <h2 className="text-2xl font-bold"> Email Details</h2>
                <button 
                  onClick={closeEmailDetails}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-all"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                <div className="space-y-6">
                  {/* Email Header */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{selectedEmail.subject}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-semibold text-gray-700">From:</span>
                        <span className="ml-2 text-gray-600">{selectedEmail.from}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">To:</span>
                        <span className="ml-2 text-gray-600">{selectedEmail.to.join(", ")}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Date:</span>
                        <span className="ml-2 text-gray-600">
                          {new Date(selectedEmail.date).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Folder:</span>
                        <span className="ml-2 text-gray-600">{selectedEmail.folder}</span>
                      </div>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-700">Category:</span>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-white font-semibold text-sm shadow-md ${getCategoryColor(selectedEmail.aiCategory)}`}>
                      <span>{selectedEmail.aiCategory}</span>
                    </div>
                  </div>

                  {/* Email Body */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Content:</h4>
                    <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                      <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">
                        {selectedEmail.body}
                      </pre>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        closeEmailDetails();
                        openEmailModal(selectedEmail);
                      }}
                      className="px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-all"
                    >
                       Edit Email
                    </button>
                    <button
                      onClick={() => {
                        closeEmailDetails();
                        handleSuggestReply(selectedEmail.id);
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                    >
                       Suggest Reply
                    </button>
                    <button
                      onClick={closeEmailDetails}
                      className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;