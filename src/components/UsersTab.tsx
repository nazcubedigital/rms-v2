import React, { useState } from "react";
import { DatabaseState, User } from "../types";
import { Plus, Edit2, Trash2, Shield, ToggleLeft, ToggleRight, Key, Mail, Phone, RefreshCw, Eye, EyeOff, Upload, UserPlus } from "lucide-react";

interface UsersTabProps {
  state: DatabaseState;
  currentUser: User | null;
  onAddUser: (newUser: User) => Promise<any>;
  onUpdateUser: (id: string, updatedUser: User) => Promise<any>;
  onDeleteUser: (id: string) => Promise<any>;
  onUploadFile?: (base64Data: string, fileName: string) => Promise<string>;
}

export default function UsersTab({
  state,
  currentUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onUploadFile
}: UsersTabProps) {
  const { users } = state;

  const sortedUsers = React.useMemo(() => {
    return [...users].sort((a, b) => {
      const timeB = a["Created At"] ? new Date(a["Created At"]).getTime() : 0;
      const timeA = b["Created At"] ? new Date(b["Created At"]).getTime() : 0;
      if (timeB !== timeA) {
        return timeA - timeB; // Sorted recently (newest) first
      }
      return b.ID.localeCompare(a.ID);
    });
  }, [users]);

  // Role Category Configuration
  const rolesOrder: { role: "admin" | "manager" | "staff" | "security"; label: string; desc: string; badgeColor: string }[] = [
    { role: "admin", label: "Administrators", desc: "Full administrative permissions, user authority, and core dashboard control", badgeColor: "bg-slate-105 text-slate-800 border-slate-200" },
    { role: "manager", label: "Managers", desc: "Full read & write access to billing, registry, and ledger actions", badgeColor: "bg-teal-50 text-teal-800 border-teal-100" },
    { role: "staff", label: "Staff Members", desc: "Standard entry permissions, utility reports, and dashboard overview", badgeColor: "bg-blue-50 text-blue-800 border-blue-100" },
    { role: "security", label: "Security Officers", desc: "Active visitor pass scanning, visitor logs, and guard house booth", badgeColor: "bg-indigo-50 text-indigo-800 border-indigo-100" }
  ];

  // Modal Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  // Form Inputs
  const [id, setId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "manager" | "staff" | "security">("staff");
  const [isActive, setIsActive] = useState(true);
  const [avatar, setAvatar] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [showFormPassword, setShowFormPassword] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleShowAddModal = () => {
    setEditUser(null);
    setId(`U${(users.length + 1).toString().padStart(3, "0")}`);
    setFullName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setRole("staff");
    setIsActive(true);
    setAvatar("");
    setUploadError("");
    setShowFormPassword(false);
    setShowAddModal(true);
  };

  const handleShowEditModal = (usr: User) => {
    setEditUser(usr);
    setId(usr.ID);
    setFullName(usr["Full Name"]);
    setEmail(usr.Email);
    setPhone(usr.Phone || "");
    setPassword(usr.Password || "");
    setRole(usr.Role);
    setAvatar(usr.Avatar || "");
    setUploadError("");
    // Accommodating Sheet string representations
    const actVal = usr["Is Active"];
    setIsActive(actVal === true || 
                String(actVal).trim().toLowerCase() === "true" ||
                String(actVal).trim().toLowerCase() === "active" ||
                String(actVal).trim().toLowerCase() === "yes" ||
                String(actVal).trim().toLowerCase() === "1");
    setShowFormPassword(false);
    setShowAddModal(true);
  };

  const handleDelete = (uId: string) => {
    if (uId === currentUser?.ID) {
      setErrorMessage("Error: You cannot delete your own logged-in user account!");
      return;
    }
    setDeleteConfirmId(uId);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    setIsSubmitting(true);
    try {
      await onDeleteUser(deleteConfirmId);
      setShowAddModal(false);
      setEditUser(null);
    } catch (err) {
      setErrorMessage("Delete failed. Check Sheets connection.");
    } finally {
      setIsSubmitting(false);
      setDeleteConfirmId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) return;
    setIsSubmitting(true);

    const userData: User = {
      ID: id,
      "Full Name": fullName,
      Email: email,
      Phone: phone,
      Password: password || "password123", // default simple starter password
      Role: role,
      Avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${fullName.replace(/\s+/g, '')}`,
      "Is Active": isActive,
      "Created At": editUser?.["Created At"] || new Date().toISOString(),
      "Updated At": new Date().toISOString()
    };

    try {
      if (editUser) {
        await onUpdateUser(editUser.ID, userData);
      } else {
        await onAddUser(userData);
      }
      setShowAddModal(false);
    } catch (err) {
      alert("Error saving user record. Verify Apps Script URL is correct.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Profile picture exceeds 2MB limit.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload a valid image file.");
      return;
    }

    setIsUploading(true);
    setUploadError("");

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      if (!base64Data) {
        setUploadError("Failed to encode image data.");
        setIsUploading(false);
        return;
      }

      try {
        if (onUploadFile) {
          // Send to Google Drive, returns the hosted direct url view format
          const driveUrl = await onUploadFile(base64Data, `avatar_${id}_${file.name}`);
          setAvatar(driveUrl);
        } else {
          // Sandbox fallback
          setAvatar(base64Data);
        }
      } catch (err: any) {
        setUploadError(err.message || "File upload to cloud failed.");
      } finally {
        setIsUploading(false);
      }
    };

    reader.onerror = () => {
      setUploadError("Failed to read selected image.");
      setIsUploading(false);
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-8 text-gray-900" id="users-tab-view">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between justify-start gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Management Accounts</h2>
          <p className="text-xs text-slate-500">Configure operator passwords, authorize system roles, and audit login access states</p>
        </div>
        {currentUser?.Role === "admin" && (
          <button
            id="trigger-add-user-modal"
            onClick={handleShowAddModal}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-900 border border-slate-950 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Account
          </button>
        )}
      </div>

      {/* Users Categorized Group Lists */}
      <div className="space-y-10">
        {rolesOrder.map(({ role: currRole, label, desc, badgeColor }) => {
          const roleUsers = sortedUsers.filter(u => u.Role === currRole);
          if (roleUsers.length === 0) return null;

          return (
            <div key={currRole} className="space-y-4" id={`role-section-${currRole}`}>
              {/* Category Subheader */}
              <div className="pb-2.5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{label}</h3>
                    <span className="inline-flex items-center justify-center bg-slate-100 border border-slate-205/60 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] h-5">
                      {roleUsers.length}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-450 mt-0.5 leading-tight">{desc}</p>
                </div>
              </div>

              {/* Grid block */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roleUsers.map((u) => {
                  const actVal = u["Is Active"];
                  const userActive = actVal === true || 
                                     String(actVal).trim().toLowerCase() === "true" ||
                                     String(actVal).trim().toLowerCase() === "active" ||
                                     String(actVal).trim().toLowerCase() === "yes" ||
                                     String(actVal).trim().toLowerCase() === "1";
                  return (
                    <div
                      key={u.ID}
                      className={`p-5 rounded-xl border bg-white shadow-sm flex flex-col justify-between hover:shadow transition duration-200 ${
                        userActive ? "border-slate-205/60" : "border-slate-100 opacity-60"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <span className="font-mono text-[10px] font-bold text-slate-400">UUID: {u.ID}</span>
                          <div className="flex items-center gap-1">
                            <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${badgeColor}`}>
                              <Shield className="w-2.5 h-2.5" />
                              {u.Role}
                            </span>
                            <span className={`w-2 h-2 rounded-full ${userActive ? "bg-emerald-500" : "bg-red-400 animate-pulse"}`} title={userActive ? "Account Active" : "Suspended"} />
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <img
                            referrerPolicy="no-referrer"
                            src={u.Avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.ID}`}
                            alt="user avatar"
                            className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-150 object-cover"
                          />
                          <div className="overflow-hidden">
                            <h4 className="font-bold text-slate-900 text-sm leading-snug truncate">{u["Full Name"]}</h4>
                            <span className="text-[10px] text-slate-450 block font-mono truncate">{u.Email}</span>
                          </div>
                        </div>

                        <div className="mt-4 space-y-1.5 text-[11px] text-slate-500 pl-1 border-l-2 border-slate-300">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{u.Phone || "N/A"}</span>
                          </div>
                          {currentUser?.Role === "admin" && (
                            <div className="flex items-center gap-1.5 text-slate-400 font-mono">
                              <Key className="w-3.5 h-3.5 shrink-0" />
                              <div className="flex items-center gap-1">
                                <span>Pass: <code className="text-slate-800 font-extrabold bg-slate-100 px-1 py-0.5 rounded text-[10px] border border-slate-200">
                                  {visiblePasswords[u.ID] ? u.Password : "••••••••"}
                                </code></span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVisiblePasswords(prev => ({
                                      ...prev,
                                      [u.ID]: !prev[u.ID]
                                    }));
                                  }}
                                  className="p-0.5 hover:text-indigo-600 rounded transition cursor-pointer"
                                  title={visiblePasswords[u.ID] ? "Hide passphrase" : "Show passphrase"}
                                >
                                  {visiblePasswords[u.ID] ? <EyeOff className="w-3 h-3 text-slate-500" /> : <Eye className="w-3 h-3 text-slate-500" />}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions Footer */}
                      {currentUser?.Role === "admin" && (
                        <div className="mt-6 pt-3.5 border-t border-slate-100 flex items-center justify-end">
                          <button
                            onClick={() => handleShowEditModal(u)}
                            title="Manage operator details"
                            className="p-1.5 text-gray-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer font-bold flex items-center gap-1 text-[11px]"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                            <span>Manage Account</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Users Modal */}
      {showAddModal && (
        <div id="user-form-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200 text-slate-800"
          >
            <h3 className="text-base font-bold text-slate-900 mb-4 border-b border-slate-100 pb-3">
              {editUser ? "Modify Management Account" : "Register Operator Profile"}
            </h3>

            {/* Profile Avatar Upload Block */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl mb-4">
              <div className="relative">
                <img
                  referrerPolicy="no-referrer"
                  src={avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${fullName || id || "default"}`}
                  alt="Profile Preview"
                  className="w-20 h-20 rounded-full bg-white object-cover border-2 border-slate-200 shadow-sm"
                />
                <label
                  htmlFor="profile-avatar-upload"
                  className="absolute bottom-0 right-0 p-1.5 bg-slate-900 rounded-full text-white hover:bg-slate-800 cursor-pointer shadow-md transition flex items-center justify-center border border-white"
                  title="Upload profile picture"
                >
                  <Upload className="w-3.5 h-3.5" />
                </label>
                <input
                  type="file"
                  id="profile-avatar-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              {isUploading && (
                <span className="text-[10px] text-indigo-600 font-bold mt-2 animate-pulse">
                  Uploading image to cloud...
                </span>
              )}
              {uploadError && (
                <span className="text-[10px] text-rose-500 font-bold mt-2 text-center">
                  {uploadError}
                </span>
              )}
              {!isUploading && !uploadError && (
                <div className="text-center mt-2">
                  <span className="text-[10px] text-slate-500 block">
                    {avatar ? "Custom photo linked" : "No custom photo uploaded"}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    Images are automatically shared and hosted via Google Drive
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">User ID (Unique)</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. U004"
                    id="user-key-id"
                    disabled={editUser !== null}
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-800 outline-none font-bold disabled:bg-slate-100 disabled:text-slate-450"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Select System Role</label>
                  <select
                    value={role}
                    id="user-role-select"
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-800 outline-none font-medium"
                  >
                    <option value="admin">Administrator</option>
                    <option value="manager">Manager</option>
                    <option value="staff">Staff Member</option>
                    <option value="security">Security Guard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Full Occupant Name</label>
                <input
                  required
                  type="text"
                  id="user-fullname-field"
                  placeholder="e.g. Michael Jordan"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-800 outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Email / Username</label>
                  <input
                    required
                    type="email"
                    id="user-email-field"
                    placeholder="michael@nazcube.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-800 outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    id="user-phone-field"
                    placeholder="+601..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-800 outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Passphrase Code</label>
                <div className="relative">
                  <input
                    required
                    type={showFormPassword ? "text" : "password"}
                    id="user-password-field"
                    placeholder="Set secret code"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-10 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-indigo-700 font-bold outline-none font-mono tracking-wide"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFormPassword(!showFormPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-indigo-650 transition cursor-pointer"
                    title={showFormPassword ? "Hide passphrase" : "Show passphrase"}
                  >
                    {showFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  id="user-status-left"
                  onClick={() => setIsActive(!isActive)}
                  className="text-slate-500 hover:text-slate-905 transition focus:outline-none"
                >
                  {isActive ? (
                    <ToggleRight className="w-10 h-10 text-slate-900" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-slate-300" />
                  )}
                </button>
                <div>
                  <span className="font-semibold text-slate-900 text-[11px] block">Account login validation</span>
                  <p className="text-[10px] text-slate-450">Active operators can sign in. Off-toggle disables system access immediately</p>
                </div>
              </div>
            </div>

            {/* Modal actions - clean bottom balance alignment */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <div>
                {editUser && currentUser?.Role === "admin" && (
                  <button
                    type="button"
                    onClick={() => handleDelete(editUser.ID)}
                    className="py-2.5 px-3.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 font-semibold flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Operator</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  id="close-user-form-btn"
                  onClick={() => setShowAddModal(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-600 cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-user-form-btn"
                  disabled={isSubmitting || isUploading}
                  className="py-2.5 px-5 rounded-xl bg-slate-950 text-white font-semibold hover:bg-slate-800 shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Syncing..." : editUser ? "Update Profile" : "Create Operator"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deleteConfirmId && (
        <div id="delete-user-confirm-overlay" className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200 text-slate-800">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Delete Operator Account?</h3>
            <p className="text-xs text-slate-500 mb-4 leading-normal">
              Are you sure you want to revoke system privileges for operator <span className="font-bold text-slate-900">{deleteConfirmId}</span>? This cannot be undone.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 px-3 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold rounded-lg text-xs cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs cursor-pointer transition disabled:opacity-50"
              >
                {isSubmitting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message Alert Modal */}
      {errorMessage && (
        <div id="user-error-overlay" className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200 text-slate-800">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-100">
              <Key className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Action Restricted</h3>
            <p className="text-xs text-slate-500 mb-4 leading-normal">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs cursor-pointer transition"
            >
              Understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
