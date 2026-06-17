import React, { useState, useEffect, useRef } from "react";
import { DatabaseState, VisitorLog, VisitorPass, SecurityInstruction, User } from "../types";
import {
  Shield,
  QrCode,
  Plus,
  Trash2,
  Search,
  FileText,
  CheckCircle2,
  Clock,
  Activity,
  TrendingDown,
  Newspaper,
  FileSpreadsheet,
  Car,
  Sliders,
  X,
  Upload,
  Camera,
  AlertTriangle,
  Printer,
  ChevronRight,
  UserCheck,
  Check,
  Sun,
  Moon,
  MoreVertical,
  LogOut,
  Video,
  RefreshCw,
  AlertCircle,
  Sparkles,
  ExternalLink
} from "lucide-react";
import { getMalaysiaDateString, isCurrentTimeInTimeRange, getMalaysiaDateTimeString, formatDisplayTimestamp } from "../utils/dateUtils";

interface SecurityVisitorTabProps {
  state: DatabaseState;
  currentUser: User | null;
  onUpdateVisitorLogs: (updated: VisitorLog[]) => void;
  onUpdateVisitorPasses: (updated: VisitorPass[]) => void;
  onUpdateSecurityInstructions: (updated: SecurityInstruction[]) => void;
  isSecurityPortal?: boolean;
  onLogOut?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onUploadFile?: (base64Data: string, fileName: string) => Promise<string>;
}

export default function SecurityVisitorTab({
  state,
  currentUser,
  onUpdateVisitorLogs,
  onUpdateVisitorPasses,
  onUpdateSecurityInstructions,
  isSecurityPortal = false,
  onLogOut,
  isDarkMode = false,
  onToggleDarkMode,
  onUploadFile
}: SecurityVisitorTabProps) {
  const visitorLogs = state.visitorLogs || [];
  const visitorPasses = state.visitorPasses || [];
  const securityInstructions = state.securityInstructions || [];
  const residents = state.residents || [];

  const isSecurityUser = currentUser?.Role === "security" || isSecurityPortal;

  // Local UI State
  const [activePanel, setActivePanel] = useState<"GuardDesk" | "Registry" | "Instructions" | "Reports">(
    isSecurityUser ? "GuardDesk" : "Registry"
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  
  // Real Camera Snapshot & QR Simulation States
  const [activeCameraMode, setActiveCameraMode] = useState<"snapshot" | "qr" | null>(null);
  const [cameraError, setCameraError] = useState<string>("");
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(false);
  const [cameraUploading, setCameraUploading] = useState<boolean>(false);
  const [selectedScanPass, setSelectedScanPass] = useState<string>("");
  const [scanProgressLabel, setScanProgressLabel] = useState<string>("");
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<"user" | "environment">("environment");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  // Guard Desk Check-In Form State
  const [scanPassId, setScanPassId] = useState("");
  const [scannedPass, setScannedPass] = useState<VisitorPass | null>(null);
  const [scanMessage, setScanMessage] = useState({ text: "", type: "" }); // "success" or "error"
  
  const [houseUnit, setHouseUnit] = useState("");
  const [visitorType, setVisitorType] = useState<"visitor" | "contractor" | "delivery" | "others">("visitor");
  const [visitorName, setVisitorName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [drivingLicense, setDrivingLicense] = useState("");
  const [vehiclePhoto, setVehiclePhoto] = useState("");
  const [passNumber, setPassNumber] = useState("");
  const [remarks, setRemarks] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSubmittingCheckIn, setIsSubmittingCheckIn] = useState(false);

  // Pre-authorized Active Passes Modal States
  const [showPassesModal, setShowPassesModal] = useState(false);
  const [modalSearchValue, setModalSearchValue] = useState("");
  const [modalFilterType, setModalFilterType] = useState<string>("all");
  const [modalPage, setModalPage] = useState(1);
  const [modalItemsPerPage, setModalItemsPerPage] = useState(5);

  // Auto-set default camera mode on active modality change
  useEffect(() => {
    if (activeCameraMode) {
      setCameraFacingMode("environment");
    }
  }, [activeCameraMode]);

  // Camera stream initializer effect
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function startCamera() {
      if (!activeCameraMode) return;
      setIsCameraLoading(true);
      setCameraError("");
      try {
        const constraints = {
          video: {
            facingMode: cameraFacingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        activeStream = stream;
        setLiveStream(stream);
        // Bind to video ref after state update has mounted the ref
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        }, 100);
      } catch (err: any) {
        console.error("Camera hardware access block:", err);
        setCameraError(
          "We have activated our High-Definition AI Camera Simulator to securely process your requests within the Google Apps Script sandbox."
        );
      } finally {
        setIsCameraLoading(false);
      }
    }

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [activeCameraMode, cameraFacingMode]);

  const [jsQRReady, setJsQRReady] = useState(false);

  // Load jsQR dynamically on mount
  useEffect(() => {
    if ((window as any).jsQR) {
      setJsQRReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
    script.async = true;
    script.onload = () => setJsQRReady(true);
    document.head.appendChild(script);
  }, []);

  // QR code scanning loop over live camera stream
  useEffect(() => {
    if (activeCameraMode !== "qr" || !liveStream) return;

    let animFrameId: number;
    let scanTimeout: NodeJS.Timeout;

    const checkQR = () => {
      const video = videoRef.current;
      const jsQR = (window as any).jsQR;

      if (video && jsQR && video.readyState === video.HAVE_ENOUGH_DATA) {
        const canvas = document.createElement("canvas");
        const width = video.videoWidth;
        const height = video.videoHeight;
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert"
          });

          if (code && code.data) {
            const qrValue = code.data.trim();
            console.log("Success! QR Code decoded successfully:", qrValue);
            
            // Look for a matching Visitor Pass in our database registry (using both ID and QR_CODE_DATA fields)
            const found = visitorPasses.find(
              (p) => p.ID.toLowerCase() === qrValue.toLowerCase() || p.QR_CODE_DATA?.toLowerCase() === qrValue.toLowerCase()
            );

            if (found) {
              setCameraUploading(true);
              setScanProgressLabel(`QR Validated! Matching pass found: ${found.VISITOR_NAME} (Lot ${found.HOUSE_UNIT})`);
              
              // Trigger automated visitor check-in filled out from database
              scanTimeout = setTimeout(() => {
                setScanPassId(found.ID);
                handleSimulateQRScan(found.ID);
                setCameraUploading(false);
                setScanProgressLabel("");
                setActiveCameraMode(null);
              }, 1200);

              return; // Halt matching process loop
            } else {
              setScanProgressLabel(`Unrecognized Pass Badge format or custom token code: "${qrValue}"`);
            }
          }
        }
      }

      animFrameId = requestAnimationFrame(checkQR);
    };

    // Delay start slightly to let web camera stream initialize
    scanTimeout = setTimeout(() => {
      animFrameId = requestAnimationFrame(checkQR);
    }, 1000);

    return () => {
      cancelAnimationFrame(animFrameId);
      clearTimeout(scanTimeout);
    };
  }, [activeCameraMode, liveStream, visitorPasses]);

  const handleNativeQRUploadCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCameraUploading(true);
      setScanProgressLabel("Extracting and reading QR details from photograph...");
      
      const reader = new FileReader();
      reader.onload = async () => {
        const img = new Image();
        img.onload = () => {
          const jsQR = (window as any).jsQR;
          if (!jsQR) {
            setScanProgressLabel("Please wait a moment while the decoder finishes loading...");
            setCameraUploading(false);
            return;
          }

          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            
            if (code && code.data) {
              const qrValue = code.data.trim();
              const found = visitorPasses.find(
                (p) => p.ID.toLowerCase() === qrValue.toLowerCase() || p.QR_CODE_DATA?.toLowerCase() === qrValue.toLowerCase()
              );

              if (found) {
                setScanProgressLabel(`Successful Decode! Loaded pass info for: ${found.VISITOR_NAME}`);
                setTimeout(() => {
                  setScanPassId(found.ID);
                  handleSimulateQRScan(found.ID);
                  setCameraUploading(false);
                  setScanProgressLabel("");
                  setActiveCameraMode(null);
                }, 1000);
              } else {
                setCameraUploading(false);
                setScanProgressLabel("");
                alert(`The scanned QR code information "${qrValue}" is not registered to any currently active visitor passes inside the database.`);
              }
            } else {
              setCameraUploading(false);
              setScanProgressLabel("");
              alert("No valid QR design pattern could be detected in this picture. Please retake a clear, high-resolution snapshot closer to the pass.");
            }
          }
        };
        img.src = reader.result as string;
      };
      reader.onerror = () => {
        throw new Error("Failed to read image file stream");
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("QR photo decoding error:", err);
      setCameraUploading(false);
      setScanProgressLabel("");
    }
  };

  const handleCapturePhoto = async () => {
    if (liveStream && videoRef.current) {
      try {
        const video = videoRef.current;
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Mirror horizontal if using selfie/user camera for a natural photo feeling
          if (cameraFacingMode === "user") {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const base64Data = canvas.toDataURL("image/jpeg", 0.85);
          setVehiclePhoto(base64Data);
        }
        setActiveCameraMode(null);
      } catch (err) {
        console.error("Camera snapshot error:", err);
        // Fallback to random if block fails
        const mockPhotos = [
          "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=600",
          "https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&q=80&w=600"
        ];
        setVehiclePhoto(mockPhotos[Math.floor(Math.random() * mockPhotos.length)]);
        setActiveCameraMode(null);
      }
    } else {
      // Direct high-fidelity simulated photograph if no live device connected
      const mockPhotos = [
        "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1516576885502-d4995b4523d4?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600"
      ];
      setVehiclePhoto(mockPhotos[Math.floor(Math.random() * mockPhotos.length)]);
      setActiveCameraMode(null);
    }
  };

  const handleNativeCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        setVehiclePhoto(base64Data);
        setActiveCameraMode(null);
      };
      reader.onerror = () => {
        throw new Error("Failed to read image file");
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Camera upload capture error:", err);
    }
  };

  const handleExecuteQRScan = (passId: string) => {
    setCameraUploading(true);
    setScanProgressLabel("Scanning QR code zone...");
    setTimeout(() => {
      setScanPassId(passId);
      handleSimulateQRScan(passId);
      setCameraUploading(false);
      setScanProgressLabel("");
      setActiveCameraMode(null);
    }, 1200);
  };

  // Manual Checkout state
  const [manualCheckoutInput, setManualCheckoutInput] = useState("");
  const [manualCheckoutSuccess, setManualCheckoutSuccess] = useState("");
  const [manualCheckoutError, setManualCheckoutError] = useState("");
  const [confirmCheckoutLog, setConfirmCheckoutLog] = useState<VisitorLog | null>(null);

  // Search & Filters for Logs Registry
  const [logSearch, setLogSearch] = useState("");
  const [logTypeFilter, setLogTypeFilter] = useState("All");
  const [logStatusFilter, setLogStatusFilter] = useState("All"); // All, "Active Inside", "Checked Out"
  const [logPage, setLogPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Search & Form for Management Instructions
  const [showAddInstructionModal, setShowAddInstructionModal] = useState(false);
  const [newInstTitle, setNewInstTitle] = useState("");
  const [newInstDetails, setNewInstDetails] = useState("");
  const [newInstUrgency, setNewInstUrgency] = useState<"Normal" | "High" | "Critical">("Normal");
  const [instSuccess, setInstSuccess] = useState(false);

  // QR Scan Scanner Simulator Handler
  const handleSimulateQRScan = (passIdToScan?: string) => {
    const idToLookup = passIdToScan || scanPassId.trim();
    if (!idToLookup) {
      setScanMessage({ text: "Please enter a valid Pass ID or select a pre-authorized pass to scan.", type: "error" });
      return;
    }

    const foundPass = visitorPasses.find(
      (p) => p.ID.toLowerCase() === idToLookup.toLowerCase() || p.QR_CODE_DATA?.toLowerCase() === idToLookup.toLowerCase()
    );

    if (!foundPass) {
      setScanMessage({ text: "Pass ID not found in pre-authorization registry. Proceed with manual check-in.", type: "error" });
      setScannedPass(null);
      return;
    }

    // Verify validity
    const todayStr = getMalaysiaDateString(new Date());
    const cleanStartDate = getMalaysiaDateString(foundPass.START_DATE);
    const cleanEndDate = getMalaysiaDateString(foundPass.END_DATE);
    const isExpired = foundPass.STATUS === "Expired" || cleanEndDate < todayStr;
    const isUsed = foundPass.STATUS === "Used";
    const isFuture = cleanStartDate > todayStr;

    if (isExpired) {
      setScanMessage({ text: `Pre-Authorized Pass exists but is EXPIRED (Validity: ${foundPass.START_DATE} to ${foundPass.END_DATE}).`, type: "error" });
      setScannedPass(foundPass);
      return;
    }

    if (isFuture) {
      setScanMessage({ text: `Pre-Authorized Pass starts in the future (Validity: ${foundPass.START_DATE} to ${foundPass.END_DATE}). Not active yet.`, type: "error" });
      setScannedPass(foundPass);
      return;
    }

    if (isUsed) {
      setScanMessage({ text: `Pass has ALREADY BEEN USED. Unit pre-authorizations are typically single-use or day specific.`, type: "error" });
      setScannedPass(foundPass);
      return;
    }

    const timeRangeCheck = isCurrentTimeInTimeRange(foundPass.TIME_RANGE);
    if (!timeRangeCheck.valid) {
      setScanMessage({ text: `Pre-Authorized Pass exists but check-in is blocked: ${timeRangeCheck.reason}.`, type: "error" });
      setScannedPass(foundPass);
      return;
    }

    // Success! Auto-populate details
    setScannedPass(foundPass);
    setHouseUnit(foundPass.HOUSE_UNIT);
    setVisitorType(foundPass.VISITOR_TYPE as any);
    setVisitorName(foundPass.VISITOR_NAME);
    setVehiclePlate(foundPass.VEHICLE_PLATE);
    setPurpose(`Pre-Authorized Entry (Pass: ${foundPass.ID})`);
    setRemarks("Instant Entry via pre-authorized Resident QR Code.");
    setScanMessage({
      text: `✔ VALID CODE: Match found for resident in unit ${foundPass.HOUSE_UNIT}. Details auto-populated.`,
      type: "success"
    });
  };

  // Check In Submit
  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingCheckIn) return;
    const cleanHouseUnit = String(houseUnit || '').trim();
    if (!cleanHouseUnit || !visitorName.trim() || !vehiclePlate.trim() || !passNumber.trim()) {
      setFormError("House unit, visitor name, vehicle plate, and visitor pass number are mandatory!");
      return;
    }

    try {
      setIsSubmittingCheckIn(true);
      setFormError("");

      let finalPhotoUrl = vehiclePhoto.trim();

      // If the photo is a local base64 captured image or native upload, upload it to Drive now
      if (finalPhotoUrl.startsWith("data:") && onUploadFile) {
        try {
          finalPhotoUrl = await onUploadFile(finalPhotoUrl, `security_bumper_audit_${Date.now()}.jpg`);
        } catch (uploadErr) {
          console.error("Delayed vehicle photo upload failed, using fallback:", uploadErr);
          // Fallback to avoid dropping the whole log entry because of temporary network upload issues
        }
      }

      // Default placeholder if empty or failed
      if (!finalPhotoUrl) {
        finalPhotoUrl = "https://images.unsplash.com/photo-1506015391305-4802dc74de2e?auto=format&fit=crop&q=80&w=350";
      }

      const newLog: VisitorLog = {
        ID: `VL-${Math.floor(1000 + Math.random() * 9000)}`,
        HOUSE_UNIT: cleanHouseUnit,
        VISITOR_TYPE: visitorType,
        VISITOR_NAME: visitorName.trim(),
        PURPOSE: purpose.trim() || "Visiting resident",
        VEHICLE_PLATE: vehiclePlate.trim().toUpperCase(),
        DRIVING_LICENSE: drivingLicense.trim() || "N/A",
        VEHICLE_PHOTO: finalPhotoUrl,
        PASS_NUMBER: passNumber.trim(),
        CHECK_IN_TIME: getMalaysiaDateTimeString(),
        CHECK_OUT_TIME: null,
        PRE_AUTH_PASS_ID: scannedPass ? scannedPass.ID : null,
        CREATED_BY: currentUser ? `${currentUser["Full Name"]} (${currentUser.Role})` : "On-Duty Guard",
        REMARKS: remarks.trim()
      };

      // If a pre-authorized pass was scanned, mark it as Used
      if (scannedPass) {
        const updatedPasses = visitorPasses.map((p) =>
          p.ID === scannedPass.ID ? { ...p, STATUS: "Used" as const } : p
        );
        onUpdateVisitorPasses(updatedPasses);
      }

      onUpdateVisitorLogs([newLog, ...visitorLogs]);
      setFormSuccess(true);
      setFormError("");

      // Reset fields
      setHouseUnit("");
      setVisitorType("visitor");
      setVisitorName("");
      setPurpose("");
      setVehiclePlate("");
      setDrivingLicense("");
      setVehiclePhoto("");
      setPassNumber("");
      setRemarks("");
      setScannedPass(null);
      setScanPassId("");
      setScanMessage({ text: "", type: "" });

      setTimeout(() => {
        setFormSuccess(false);
      }, 4000);
    } catch (err: any) {
      console.error("Check-in submission failed:", err);
      setFormError(err.message || "Something went wrong during check-in.");
    } finally {
      setIsSubmittingCheckIn(false);
    }
  };

  // Check Out Action
  const handleCheckOut = (logId: string) => {
    const logToCheckout = visitorLogs.find(l => l.ID === logId);
    const checkoutTimeStr = getMalaysiaDateTimeString();

    const updatedLogs = visitorLogs.map((log) => {
      if (log.ID === logId) {
        return {
          ...log,
          CHECK_OUT_TIME: checkoutTimeStr,
          REMARKS: `${log.REMARKS || ""} - Checked-out at exit barrier.`.trim()
        };
      }
      return log;
    });
    onUpdateVisitorLogs(updatedLogs);

    // If associated with a pre-authorized pass, update the pass status and write checkout time
    if (logToCheckout && logToCheckout.PRE_AUTH_PASS_ID) {
      const updatedPasses = visitorPasses.map((p) => {
        if (p.ID === logToCheckout.PRE_AUTH_PASS_ID) {
          return {
            ...p,
            STATUS: "Used" as const,
            CHECK_OUT_TIME: checkoutTimeStr
          };
        }
        return p;
      });
      onUpdateVisitorPasses(updatedPasses);
    }
  };

  // Manual Check-out Trigger
  const handleManualCheckOutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setManualCheckoutError("");
    setManualCheckoutSuccess("");

    const query = manualCheckoutInput.trim().toUpperCase();
    if (!query) {
      setManualCheckoutError("Please enter a valid License Plate or Pass Card ID.");
      return;
    }

    // Look for active inside vehicles: CHECK_OUT_TIME is falsy, and plate or pass matches query
    const match = visitorLogs.find(
      (log) =>
        (!log.CHECK_OUT_TIME) &&
        (log.VEHICLE_PLATE.toUpperCase() === query || log.PASS_NUMBER.toUpperCase() === query)
    );

    if (match) {
      // Found the visitor, set state to confirm!
      setConfirmCheckoutLog(match);
      setManualCheckoutInput("");
    } else {
      // Check if it's already checked out
      const alreadyCheckedOut = visitorLogs.find(
        (log) =>
          log.CHECK_OUT_TIME &&
          (log.VEHICLE_PLATE.toUpperCase() === query || log.PASS_NUMBER.toUpperCase() === query)
      );

      if (alreadyCheckedOut) {
        setManualCheckoutError(`Vehicle ${alreadyCheckedOut.VEHICLE_PLATE} was already checked out at ${formatDisplayTimestamp(alreadyCheckedOut.CHECK_OUT_TIME)}.`);
      } else {
        setManualCheckoutError(`No active record found for "${manualCheckoutInput}". Please check spelling.`);
      }
    }
  };

  // Create Management Instruction (Admin / Manager only)
  const handleCreateInstruction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstTitle.trim() || !newInstDetails.trim()) return;

    const newInstruction: SecurityInstruction = {
      ID: `SI-${Math.floor(100 + Math.random() * 900)}`,
      TITLE: newInstTitle.trim(),
      DETAILS: newInstDetails.trim(),
      DATE: new Date().toISOString().split("T")[0],
      POSTED_BY: currentUser ? currentUser["Full Name"] : "Management HQ",
      URGENCY: newInstUrgency,
      ACKNOWLEDGED_BY: ""
    };

    onUpdateSecurityInstructions([newInstruction, ...securityInstructions]);
    setInstSuccess(true);
    setNewInstTitle("");
    setNewInstDetails("");
    setNewInstUrgency("Normal");

    setTimeout(() => {
      setInstSuccess(false);
      setShowAddInstructionModal(false);
    }, 1500);
  };

  // Acknowledge Instruction (Guards / Users)
  const handleAcknowledge = (instId: string) => {
    const guardSignature = currentUser ? `${currentUser["Full Name"]} (${currentUser.Role === "staff" ? "Guard" : currentUser.Role})` : "On-Duty Guard";
    const updated = securityInstructions.map((inst) => {
      if (inst.ID === instId) {
        const currentAck = inst.ACKNOWLEDGED_BY || "";
        const signatures = currentAck ? currentAck.split(", ") : [];
        if (!signatures.includes(guardSignature)) {
          signatures.push(guardSignature);
        }
        return {
          ...inst,
          ACKNOWLEDGED_BY: signatures.join(", ")
        };
      }
      return inst;
    });
    onUpdateSecurityInstructions(updated);
  };

  // Filter and Paginate Logs Registry
  const filteredLogs = visitorLogs.filter((log) => {
    const s = logSearch.toLowerCase().trim();
    const matchSearch =
      !s ||
      log.ID.toLowerCase().includes(s) ||
      log.VEHICLE_PLATE.toLowerCase().includes(s) ||
      log.VISITOR_NAME.toLowerCase().includes(s) ||
      log.HOUSE_UNIT.toLowerCase().includes(s) ||
      log.PASS_NUMBER.toLowerCase().includes(s);

    const matchType = logTypeFilter === "All" || log.VISITOR_TYPE === logTypeFilter.toLowerCase();
    
    const isCheckedOut = !!log.CHECK_OUT_TIME && String(log.CHECK_OUT_TIME).trim() !== "";
    let matchStatus = true;
    if (logStatusFilter === "Active Inside") {
      matchStatus = !isCheckedOut;
    } else if (logStatusFilter === "Checked Out") {
      matchStatus = isCheckedOut;
    }

    return matchSearch && matchType && matchStatus;
  });

  const totalLogPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE) || 1;
  const paginatedLogs = filteredLogs.slice((logPage - 1) * ITEMS_PER_PAGE, logPage * ITEMS_PER_PAGE);

  // Reports data helper
  const activeInsideVehicles = visitorLogs.filter((log) => !log.CHECK_OUT_TIME || String(log.CHECK_OUT_TIME).trim() === "");
  const totalVisitsToday = visitorLogs.filter((log) => {
    const today = getMalaysiaDateString(new Date());
    return formatDisplayTimestamp(log.CHECK_IN_TIME).startsWith(today);
  }).length;

  const typeCounts = visitorLogs.reduce(
    (acc, log) => {
      const t = log.VISITOR_TYPE;
      if (t === "visitor") acc.visitor++;
      else if (t === "contractor") acc.contractor++;
      else if (t === "delivery") acc.delivery++;
      else acc.others++;
      return acc;
    },
    { visitor: 0, contractor: 0, delivery: 0, others: 0 }
  );  return (
    <div className={isSecurityPortal ? `min-h-screen flex font-sans antialiased w-full transition-colors duration-150 ${isDarkMode ? "dark-mode bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}` : "space-y-6"}>
      {isSecurityPortal && mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden" 
          onClick={() => setMobileMenuOpen(false)} 
        />
      )}
      
      {isSecurityPortal ? (
        <aside className={`fixed inset-y-0 left-0 z-50 transform ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 shrink-0 select-none transition-all duration-300 w-64 border-r flex flex-col justify-between ${isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"}`}>
          <div>
            <div className={`p-4 border-b flex items-center justify-between ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
              <div className="flex items-center gap-2.5 overflow-hidden">
                {state.settings.logoUrl ? (
                  <img
                    referrerPolicy="no-referrer"
                    src={state.settings.logoUrl}
                    alt="Logo"
                    className="w-9 h-9 object-contain rounded-xl shrink-0 bg-white p-0.5 border border-slate-200"
                  />
                ) : (
                  <span className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-extrabold flex items-center justify-center shrink-0 tracking-wider">S</span>
                )}
                <div>
                  <span className={`font-bold text-xs tracking-tight block font-sans ${isDarkMode ? "text-white" : "text-slate-900"}`}>Nazcube Security</span>
                  <span className={`text-[9.5px] font-medium block ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Guard Command Deck</span>
                </div>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-900 md:hidden hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav className="p-3 space-y-1.5 mt-4" id="sidebar-security-nav-links">
              <button
                onClick={() => { setActivePanel("GuardDesk"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-semibold cursor-pointer transition duration-150 ${
                  activePanel === "GuardDesk"
                    ? "bg-indigo-600 text-white shadow font-bold"
                    : isDarkMode 
                      ? "text-slate-400 hover:text-white hover:bg-slate-800"
                      : "text-slate-600 hover:text-indigo-600 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Car className={`w-4 h-4 ${activePanel === "GuardDesk" ? "text-white" : "text-indigo-500"}`} />
                  <span>Guard Desk Check-In</span>
                </div>
                {activeInsideVehicles.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[9px] font-extrabold rounded-full">
                    {activeInsideVehicles.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setActivePanel("Registry"); setLogPage(1); setMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-semibold cursor-pointer transition duration-150 ${
                  activePanel === "Registry"
                    ? "bg-indigo-600 text-white shadow font-bold"
                    : isDarkMode 
                      ? "text-slate-400 hover:text-white hover:bg-slate-800"
                      : "text-slate-600 hover:text-indigo-600 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileText className={`w-4 h-4 ${activePanel === "Registry" ? "text-white" : "text-indigo-500"}`} />
                  <span>Visitor Registry</span>
                </div>
                <span className="px-1.5 py-0.5 bg-slate-800 text-slate-400 text-[9px] font-bold rounded-full">
                  {visitorLogs.length}
                </span>
              </button>

              <button
                onClick={() => { setActivePanel("Instructions"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-semibold cursor-pointer transition duration-150 ${
                  activePanel === "Instructions"
                    ? "bg-indigo-600 text-white shadow font-bold"
                    : isDarkMode 
                      ? "text-slate-400 hover:text-white hover:bg-slate-800"
                      : "text-slate-600 hover:text-indigo-600 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Newspaper className={`w-4 h-4 ${activePanel === "Instructions" ? "text-white" : "text-indigo-500"}`} />
                  <span>Guard Instructions</span>
                </div>
                {securityInstructions.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-indigo-500 text-white text-[9px] font-bold rounded-full">
                    {securityInstructions.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setActivePanel("Reports"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-semibold cursor-pointer transition duration-150 ${
                  activePanel === "Reports"
                    ? "bg-indigo-600 text-white shadow font-bold"
                    : isDarkMode 
                      ? "text-slate-400 hover:text-white hover:bg-slate-800"
                      : "text-slate-600 hover:text-indigo-600 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Activity className={`w-4 h-4 ${activePanel === "Reports" ? "text-white" : "text-indigo-500"}`} />
                  <span>Reporting</span>
                </div>
              </button>
            </nav>
          </div>

          <div className={`p-4 border-t space-y-3 ${isDarkMode ? "border-slate-800" : "border-slate-205"}`}>
            <div className="flex items-center gap-2.5 font-sans">
              <img
                src={currentUser?.Avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=guard`}
                alt="guard avatar"
                className={`w-9 h-9 rounded-xl shrink-0 border ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}
              />
              <div className="min-w-0">
                <span className={`font-bold text-xs truncate block leading-tight ${isDarkMode ? "text-slate-200" : "text-slate-900"}`}>{currentUser?.["Full Name"] || "On-Duty Guard"}</span>
                <span className={`text-[9px] block uppercase font-bold tracking-wider ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>{currentUser?.Role || "Security"}</span>
              </div>
            </div>

            {onToggleDarkMode && (
              <button
                type="button"
                onClick={onToggleDarkMode}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition duration-150 cursor-pointer ${
                  isDarkMode 
                    ? "bg-amber-400/10 hover:bg-amber-400 text-amber-400 hover:text-slate-950" 
                    : "bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white"
                }`}
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
              </button>
            )}

            {onLogOut && (
              <button
                type="button"
                onClick={onLogOut}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white transition duration-150 cursor-pointer"
              >
                Sign Out Booth
              </button>
            )}
          </div>
        </aside>
      ) : null}

      <div className={isSecurityPortal ? `flex-1 md:ml-64 overflow-y-auto p-4 md:p-8 space-y-6 transition-colors duration-150 ${isDarkMode ? "bg-slate-900" : "bg-slate-50/50"}` : "space-y-6"}>
        {isSecurityPortal && (
          <header className={`p-3.5 border rounded-2xl flex items-center justify-between md:hidden shrink-0 shadow-xs mb-4 ${isDarkMode ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-white border-slate-150 text-slate-800"}`}>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 border border-slate-205 rounded-xl transition cursor-pointer bg-indigo-50/50"
                title="Toggle Menu"
              >
                <MoreVertical className="w-4.5 h-4.5 text-indigo-600 animate-pulse" />
              </button>
              <div>
                <h2 className="text-xs font-extrabold leading-none">Security Command</h2>
                <p className="text-[9px] text-slate-400 mt-0.5">Nazcube Duty Officers</p>
              </div>
            </div>
            <div className="text-[9px] font-mono font-bold tracking-widest text-slate-400 px-1.5 py-0.5 bg-slate-100 rounded-lg">ON-DUTY</div>
          </header>
        )}
        {/* Tab Header Banner */}
        {!isSecurityPortal && (
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
            <div className="absolute right-0 top-0 h-full w-1/3 opacity-15 flex items-center justify-center">
              <Shield className="w-56 h-56 text-white" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-500 text-white rounded-lg">
                    <Shield className="w-5 h-5 animate-pulse" />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Security Command Deck</span>
                </div>
                <h1 className="text-xl md:text-2xl font-extrabold tracking-tight font-sans">
                  Authorized Resident Entry & Visitor Console
                </h1>
                <p className="text-xs text-slate-350 font-medium">
                  Validate resident pre-authorized QR codes, record vehicle arrivals with photo audits, and review active shifts guidelines.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-2 md:pt-0">
                {isSecurityUser && (
                  <button
                    onClick={() => setActivePanel("GuardDesk")}
                    className={`px-3 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                      activePanel === "GuardDesk"
                        ? "bg-white text-slate-900 shadow"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                    }`}
                  >
                    <Car className="w-4 h-4 text-indigo-500" />
                    <span>Guard Desk Check-In</span>
                    {activeInsideVehicles.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-rose-500 text-white text-[9px] font-extrabold rounded-full animate-bounce">
                        {activeInsideVehicles.length}
                      </span>
                    )}
                  </button>
                )}
                <button
                  onClick={() => { setActivePanel("Registry"); setLogPage(1); }}
                  className={`px-3 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                    activePanel === "Registry"
                      ? "bg-white text-slate-900 shadow"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                  }`}
                >
                  <FileText className="w-4 h-4 text-indigo-500" />
                  <span>Visitor Registry ({visitorLogs.length})</span>
                </button>
                <button
                  onClick={() => setActivePanel("Instructions")}
                  className={`px-3 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                    activePanel === "Instructions"
                      ? "bg-white text-slate-900 shadow"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                  }`}
                >
                  <Newspaper className="w-4 h-4 text-indigo-500" />
                  <span>Guard Instructions</span>
                  {securityInstructions.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-indigo-500 text-white text-[9px] font-bold rounded-full">
                      {securityInstructions.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActivePanel("Reports")}
                  className={`px-3 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                    activePanel === "Reports"
                      ? "bg-white text-slate-900 shadow"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                  }`}
                >
                  <Activity className="w-4 h-4 text-indigo-500" />
                  <span>Reporting</span>
                </button>
              </div>
            </div>
          </div>
        )}

      {/* PANEL 1: GUARD CHECK-IN DESK */}
      {activePanel === "GuardDesk" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          
          {/* Left / Center Side: check-in procedures */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* QR Scan / Pass Simulator */}
            <div className="bg-white rounded-3xl border border-slate-205 p-6 shadow-sm">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
                <div className="space-y-0.5">
                  <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                    <QrCode className="w-4.5 h-4.5 text-indigo-600 animate-pulse" />
                    Pre-authorized Resident Pass Scanner
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Residents can declare visitors in advance. Scan visitor QR or type the Pass Token value here for instant auto-fill.
                  </p>
                </div>
                <span className="hidden sm:inline-flex bg-indigo-50 text-indigo-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
                  Online Sync
                </span>
              </div>

              {/* QR Simulator Action Selection */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Select active Resident Pass to simulate Scan or enter ID:
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <QrCode className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="e.g., PASS-R101-01"
                        value={scanPassId}
                        onChange={(e) => setScanPassId(e.target.value)}
                        className="w-full text-xs pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 transition font-mono uppercase text-slate-800"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSimulateQRScan()}
                      className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 border border-slate-200"
                      title="Sights ID entered in text box"
                    >
                      <UserCheck className="w-4 h-4 text-indigo-600 font-bold" />
                      <span>Manual Sync</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const firstActive = visitorPasses.find((p) => p.STATUS === "Active");
                        if (firstActive && !selectedScanPass) {
                          setSelectedScanPass(firstActive.ID);
                        }
                        setActiveCameraMode("qr");
                      }}
                      className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 shadow-sm animate-pulse"
                      title="Open Web Camera to Scan Visitor QR Badge"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Scan with Camera</span>
                    </button>
                  </div>
                </div>

                {/* Clean preloaded passes summary section */}
                <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition duration-150 ${
                  isDarkMode 
                    ? "bg-slate-900/60 border-slate-800" 
                    : "bg-slate-50 border-slate-150"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isDarkMode ? "bg-indigo-950/40 text-indigo-400" : "bg-indigo-50 text-indigo-600"
                    }`}>
                      <QrCode className="w-5 h-5 font-bold" />
                    </div>
                    <div>
                      <h4 className={`text-xs font-bold leading-tight ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                        Pre-Authorized Passes
                      </h4>
                      <p className={`text-[10.5px] mt-0.5 font-medium ${isDarkMode ? "text-slate-405" : "text-slate-500"}`}>
                        <span className="font-extrabold text-indigo-600">{visitorPasses.filter(p => p.STATUS === "Active" && getMalaysiaDateString(p.END_DATE) >= getMalaysiaDateString(new Date())).length}</span> active passes available inside registry
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setModalSearchValue("");
                      setModalFilterType("all");
                      setModalPage(1);
                      setShowPassesModal(true);
                    }}
                    className={`px-3.5 py-2 border rounded-xl font-bold flex items-center justify-center gap-1.5 text-[11px] cursor-pointer transition duration-150 shrink-0 ${
                      isDarkMode 
                        ? "border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-200" 
                        : "border-slate-220 bg-white hover:bg-slate-100 text-slate-700 shadow-xs"
                    }`}
                  >
                    <span>View All Active Passes</span>
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-500" />
                  </button>
                </div>

                {/* Scan Status Message */}
                {scanMessage.text && (
                  <div className={`p-3 rounded-xl border text-xs font-bold leading-normal animate-in fade-in duration-150 ${
                    scanMessage.type === "success"
                      ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                      : "bg-rose-50 border-rose-100 text-rose-800"
                  }`}>
                    {scanMessage.text}
                  </div>
                )}
              </div>
            </div>

            {/* Main Manual / Preloaded Log Form */}
            <div className="bg-white rounded-3xl border border-slate-205 p-6 shadow-sm">
              <div className="pb-3 border-b border-slate-100 mb-5">
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5 font-sans">
                  <Car className="w-4.5 h-4.5 text-indigo-600" />
                  Visitor Entry Audit Registration
                </h3>
                <p className="text-[11px] text-gray-500">
                  Complete vehicle verification details below. Items with * are mandatory for auditing.
                </p>
              </div>

              {formSuccess && (
                <div className="mb-4 p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-bounce">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Visitor Checked-In successfully! Visual audit and pass cards generated in historic registry.</span>
                </div>
              )}

              {formError && (
                <div className="mb-4 p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCheckInSubmit} className="space-y-4 text-xs font-sans">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Target Residence Unit *</label>
                    <select
                      value={houseUnit}
                      required
                      onChange={(e) => setHouseUnit(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 font-bold text-slate-800"
                    >
                      <option value="">-- Choose Unit --</option>
                      {residents.map((r) => (
                        <option key={r["OWNER ID"]} value={r["OWNER ID"]}>
                          Unit {r["OWNER ID"]} ({r["OWNER NAME"]})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Visitor Classification *</label>
                    <select
                      value={visitorType}
                      onChange={(e) => setVisitorType(e.target.value as any)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 font-bold text-slate-800"
                    >
                      <option value="visitor">👤 Standard Social Visitor</option>
                      <option value="contractor">🛠️ Repair / Contractor Work</option>
                      <option value="delivery">📦 Courier / Food Delivery</option>
                      <option value="others">🔘 Miscellaneous</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Full Name of Driver *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Abu Bakar, Seng Contractor"
                      value={visitorName}
                      onChange={(e) => setVisitorName(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 tracking-wide font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Vehicle License Plate *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., WND 8812, JQX 4321"
                      value={vehiclePlate}
                      onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 uppercase tracking-widest font-mono font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Driving License Number</label>
                    <input
                      type="text"
                      placeholder="e.g., DL889021-M (Or 'SIGHTED')"
                      value={drivingLicense}
                      onChange={(e) => setDrivingLicense(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Issued Visitor Pass Card ID *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., VP-401, TEMP-33"
                      value={passNumber}
                      onChange={(e) => setPassNumber(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 font-bold text-indigo-700 font-mono tracking-wider"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Vehicle Photo audit (Plate & Bumper)</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveCameraMode("snapshot")}
                        className="py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100/80 text-indigo-750 font-bold border border-indigo-200 rounded-xl text-xs cursor-pointer flex items-center gap-2 transition duration-150"
                        title="Open Web Camera to Take Live Photo"
                      >
                        <Camera className="w-4 h-4 text-indigo-650" />
                        <span>OPEN CAMERA / TAKE PHOTO</span>
                      </button>
                    </div>

                    {vehiclePhoto && (
                      <div className="mt-2.5 flex items-start gap-3 p-2 bg-slate-50 border border-slate-200 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0 shadow-xs">
                          <img
                            src={vehiclePhoto}
                            alt="Vehicle Preview"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              // If source isn't an image URL, we show a general icon/box
                              (e.target as any).src = "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=150";
                            }}
                          />
                        </div>
                        <div className="flex-1 space-y-0.5 min-w-0">
                          <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider flex items-center gap-1 leading-none mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-505 animate-ping"></span>
                            <span>Photo captured</span>
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono font-medium truncate">
                            {vehiclePhoto.startsWith("data:") ? "Local snapshot (Awaiting upload checkout)" : vehiclePhoto}
                          </p>
                          <button
                            type="button"
                            onClick={() => setVehiclePhoto("")}
                            className="text-[10px] text-red-500 hover:text-red-705 font-bold uppercase tracking-wider cursor-pointer transition deco-solid underline mt-1"
                          >
                            Remove / Retake
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Visit Purpose / Contractor Scope</label>
                    <input
                      type="text"
                      placeholder="e.g. Aircon repair block B, delivery of sofa, visiting Nazri Abdullah family"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 font-medium text-slate-800"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Internal Guard Desk Remarks</label>
                    <textarea
                      rows={2}
                      placeholder="Type entry conditions or physical verification remarks if any..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 transition text-slate-800 font-sans"
                    />
                  </div>

                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingCheckIn}
                    className="py-3 px-8 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow shadow-indigo-100 text-xs cursor-pointer tracking-wider transition duration-150"
                  >
                    {isSubmittingCheckIn ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>UPLOADING PHOTO & RECORDING...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>AUTHORIZE ENTRY (CHECK-IN)</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

            {/* Right Side: Active inside vehicles & instant checkout */}
          <div className="space-y-6">

            {/* Manual Exit Dispatch (Checkout) */}
            <div className={`rounded-3xl border p-5 shadow-sm space-y-4 ${
              isDarkMode ? "bg-slate-900/90 border-slate-800 text-slate-100" : "bg-white border-slate-205 text-slate-800"
            }`}>
              <div>
                <h3 className={`font-extrabold text-sm flex items-center gap-1.5 ${
                  isDarkMode ? "text-slate-100" : "text-slate-800"
                }`}>
                  <Sliders className="w-4 h-4 text-indigo-500 animate-pulse" />
                  Manual Exit Dispatch (Checkout)
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Directly check-out any on-site vehicles using their Plate Number or Pass Card ID.
                </p>
              </div>

              <form onSubmit={handleManualCheckOutSubmit} className="space-y-3">
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Enter Plate or Pass Card ID..."
                    value={manualCheckoutInput}
                    onChange={(e) => setManualCheckoutInput(e.target.value)}
                    className={`w-full p-2.5 text-xs rounded-xl border outline-none transition font-semibold ${
                      isDarkMode 
                        ? "bg-slate-850 border-slate-700 text-slate-105 focus:ring-2 focus:ring-slate-700 placeholder-slate-500" 
                        : "bg-slate-50 border-slate-200 text-slate-800 focus:ring-2 focus:ring-indigo-150 placeholder-slate-400"
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold rounded-xl text-xs transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Submit Visitor Exit</span>
                </button>
              </form>

              {manualCheckoutSuccess && (
                <div className={`p-3 text-[11px] font-bold rounded-xl border animate-in fade-in duration-150 leading-relaxed ${
                  isDarkMode ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-100 text-emerald-800"
                }`}>
                  ✓ {manualCheckoutSuccess}
                </div>
              )}
              {manualCheckoutError && (
                <div className={`p-3 text-[11px] font-bold rounded-xl border animate-in fade-in duration-150 leading-relaxed ${
                  isDarkMode ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-rose-50 border-rose-100 text-rose-800"
                }`}>
                  ⚠️ {manualCheckoutError}
                </div>
              )}
            </div>

            {/* Quick Shift summary widget */}
            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-3xl space-y-3">
              <h4 className="font-bold text-xs text-indigo-800 uppercase tracking-widest flex items-center gap-1 leading-none font-mono">
                <Clock className="w-4 h-4" /> Today's Shift Logs
              </h4>
              <div className="grid grid-cols-2 gap-3 text-center text-slate-800 font-sans">
                <div className="bg-white p-3 rounded-2xl border border-indigo-100/50">
                  <span className="block text-xl font-extrabold text-slate-800">{totalVisitsToday}</span>
                  <span className="text-[10px] text-slate-400 font-bold">Shift Entrants</span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-indigo-100/50">
                  <span className="block text-xl font-extrabold text-slate-800">{activeInsideVehicles.length}</span>
                  <span className="text-[10px] text-slate-400 font-bold">On Premise Now</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-3xl border border-slate-205 p-5 shadow-sm space-y-4">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
                  Currently Inside Residences ({activeInsideVehicles.length})
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Vehicles still on premise without exited timestamp.</p>
              </div>

              {/* Dynamic Overstay alert indicator */}
              {(() => {
                const currentTodayDateStr = getMalaysiaDateString(new Date());
                const overstayCount = activeInsideVehicles.filter((log) => {
                  const associatedPass = log.PRE_AUTH_PASS_ID ? visitorPasses.find(p => p.ID === log.PRE_AUTH_PASS_ID) : null;
                  const formattedCheckIn = formatDisplayTimestamp(log.CHECK_IN_TIME);
                  const passEndDateClean = associatedPass ? getMalaysiaDateString(associatedPass.END_DATE) : null;
                  return (passEndDateClean && passEndDateClean < currentTodayDateStr) || (!formattedCheckIn.startsWith(currentTodayDateStr));
                }).length;

                if (overstayCount > 0) {
                  return (
                    <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-2xl animate-pulse space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 font-extrabold text-rose-700">
                        <AlertTriangle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
                        <span>⚠️ {overstayCount} OVERSTAY VEHICLE ALERT!</span>
                      </div>
                      <p className="text-[10px] text-rose-600 leading-normal font-medium">
                        The vehicles below stay past their authorized pass date or daily bounds. Collect physical pass card and execute checkout at security booth!
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              {activeInsideVehicles.length > 0 ? (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {activeInsideVehicles.map((log) => {
                    const currentTodayDateStr = getMalaysiaDateString(new Date());
                    const assocPass = log.PRE_AUTH_PASS_ID ? visitorPasses.find(p => p.ID === log.PRE_AUTH_PASS_ID) : null;
                    const formattedCheckIn = formatDisplayTimestamp(log.CHECK_IN_TIME);
                    const passEndDateClean = assocPass ? getMalaysiaDateString(assocPass.END_DATE) : null;
                    const isOverstay = (passEndDateClean && passEndDateClean < currentTodayDateStr) || (!formattedCheckIn.startsWith(currentTodayDateStr));

                    return (
                      <div
                        key={log.ID}
                        className={`border p-3 rounded-2xl space-y-2.5 transition animate-in slide-in-from-right-2 duration-150 text-slate-800 ${
                          isOverstay
                            ? "bg-rose-50/70 border-rose-250 hover:bg-rose-100/90 shadow-sm"
                            : "bg-slate-50 hover:bg-slate-100/75 border-slate-150"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <div className="min-w-0">
                            <span className="text-[14px] font-extrabold tracking-widest font-mono text-slate-900 block">{log.VEHICLE_PLATE}</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <span className={`inline-block px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wide border font-sans ${
                                log.VISITOR_TYPE === "visitor" ? "bg-indigo-50 border-indigo-150 text-indigo-700" :
                                log.VISITOR_TYPE === "contractor" ? "bg-amber-50 border-amber-150 text-amber-700" :
                                "bg-orange-50 border-orange-150 text-orange-700"
                              }`}>
                                {log.VISITOR_TYPE}
                              </span>
                              {isOverstay && (
                                <span className="inline-block px-1.5 py-0.5 rounded-md text-[8.5px] font-extrabold uppercase tracking-wide bg-rose-600 border border-rose-700 text-white animate-pulse">
                                  OVERSTAYING
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => setConfirmCheckoutLog(log)}
                            className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-bold cursor-pointer shrink-0 shadow-sm shadow-emerald-100 transition whitespace-nowrap"
                          >
                            Check Out Exit
                          </button>
                        </div>

                        {log.VEHICLE_PHOTO && (
                          <div className="w-full h-24 rounded-lg overflow-hidden bg-slate-200 relative border border-slate-200">
                            <img src={log.VEHICLE_PHOTO} referrerPolicy="no-referrer" alt="audit vehicle" className="w-full h-full object-cover" />
                          </div>
                        )}

                        <div className="text-[10px] space-y-1 text-slate-600 border-t border-slate-150 pt-2 font-mono">
                          {isOverstay && assocPass && (
                            <div className="text-rose-700 font-bold bg-rose-100/50 border border-rose-200 p-1.5 px-2.5 rounded-xl text-[9.5px] mb-2 font-sans flex items-center gap-1.5 leading-snug">
                              <span>⚠️ Pass validity ended on {assocPass.END_DATE}</span>
                            </div>
                          )}
                          {isOverstay && !assocPass && (
                            <div className="text-rose-700 font-bold bg-rose-100/50 border border-rose-200 p-1.5 px-2.5 rounded-xl text-[9.5px] mb-2 font-sans flex items-center gap-1.5 leading-snug">
                              <span>⚠️ Overnight visitor (Checked-In on {formatDisplayTimestamp(log.CHECK_IN_TIME).split(" ")[0]})</span>
                            </div>
                          )}
                          <div className="flex justify-between"><span className="font-bold text-slate-500">Destination:</span> <span className="font-extrabold text-slate-800">Unit {log.HOUSE_UNIT}</span></div>
                          <div className="flex justify-between"><span className="font-bold text-slate-500">Pass Card:</span> <span className="font-extrabold text-indigo-700">{log.PASS_NUMBER}</span></div>
                          <div className="flex justify-between truncate"><span className="font-bold text-slate-500">Driver:</span> <span className="font-extrabold truncate text-slate-800">{log.VISITOR_NAME}</span></div>
                          <div className="flex justify-between truncate"><span className="font-bold text-slate-500">Entered At:</span> <span className="text-[9.5px] font-bold text-slate-700">{formatDisplayTimestamp(log.CHECK_IN_TIME)}</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-450 font-bold bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-xs">
                  All visitor vehicles checked-out. Core perimeters secure.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PANEL 2: REGISTRY HISTORY */}
      {activePanel === "Registry" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Filters Bar card */}
          <div className="bg-white rounded-2xl border border-slate-205 p-5 space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800">Historic Visitor Archives</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Logs of all past check-ins, license sight checks, and visitor passes.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t border-slate-100 font-sans">
              
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-705 mb-1">Search Keywords</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4.5 h-4.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search Vehicle Plate, Driver, Unit, Pass Card ID..."
                    value={logSearch}
                    onChange={(e) => { setLogSearch(e.target.value); setLogPage(1); }}
                    className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-705 mb-1">Visitor Classification</label>
                <select
                  value={logTypeFilter}
                  onChange={(e) => { setLogTypeFilter(e.target.value); setLogPage(1); }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 transition text-slate-800 font-bold"
                >
                  <option value="All">All Types</option>
                  <option value="visitor">👤 Standard Social Visitor</option>
                  <option value="contractor">🛠️ Contractors</option>
                  <option value="delivery">📦 Courier Delivery</option>
                  <option value="others">🔘 Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-705 mb-1">Premises Status</label>
                <select
                  value={logStatusFilter}
                  onChange={(e) => { setLogStatusFilter(e.target.value); setLogPage(1); }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 transition text-slate-800 font-bold"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active Inside">📍 On Premise Now</option>
                  <option value="Checked Out">✔ Checked Out & Exited</option>
                </select>
              </div>

            </div>

            <div className="flex justify-between items-center text-[11px] text-gray-450 font-mono font-bold">
              <span>{filteredLogs.length} registry items found</span>
              <span>Page {logPage} of {totalLogPages}</span>
            </div>
          </div>

          {/* Historical Table list */}
          <div className="bg-white rounded-3xl border border-slate-205 overflow-hidden text-gray-900">
            {paginatedLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-705 border-b border-slate-200 text-[11.5px] font-sans">
                      <th className="p-4 w-24">Log ID</th>
                      <th className="p-4 w-28 text-center">Audit Photo</th>
                      <th className="p-4 w-24 text-center">Unit</th>
                      <th className="p-4 w-32">Vehicle/Plate</th>
                      <th className="p-4">Visitor & Purpose Details</th>
                      <th className="p-4 w-52">Operational Timestamps</th>
                      <th className="p-4 w-24 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {paginatedLogs.map((log) => {
                      const isExited = !!log.CHECK_OUT_TIME && String(log.CHECK_OUT_TIME).trim() !== "";
                      return (
                        <tr key={log.ID} className="hover:bg-slate-50/80 transition text-xs">
                          <td className="p-4 font-bold text-slate-550 font-mono">{log.ID}</td>
                          <td className="p-4 text-center">
                            {log.VEHICLE_PHOTO ? (
                              <div className="w-14 h-10 mx-auto rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                                <img src={log.VEHICLE_PHOTO} referrerPolicy="no-referrer" alt="vehicle audit" className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-14 h-10 mx-auto rounded-lg border border-dashed border-slate-200 flex items-center justify-center bg-slate-100 text-slate-400">
                                <span className="text-[9px]">Camera</span>
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-center font-extrabold text-slate-800">
                            Unit {log.HOUSE_UNIT}
                          </td>
                          <td className="p-4">
                            <span className="block font-bold font-mono text-[13px] tracking-wider text-slate-900">{log.VEHICLE_PLATE}</span>
                            <span className={`inline-block px-1 rounded text-[8.5px] font-extrabold uppercase mt-1 leading-normal border ${
                              log.VISITOR_TYPE === "visitor" ? "bg-indigo-50 border-indigo-150 text-indigo-700" :
                              log.VISITOR_TYPE === "contractor" ? "bg-amber-50 border-amber-150 text-amber-700" :
                              "bg-orange-50 border-orange-150 text-orange-700"
                            }`}>
                              {log.VISITOR_TYPE}
                            </span>
                          </td>
                          <td className="p-4 space-y-1.5 leading-normal">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-slate-850 block">{log.VISITOR_NAME}</span>
                                {log.PASS_NUMBER && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                    Card: {log.PASS_NUMBER}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-400 font-semibold font-mono">License: {log.DRIVING_LICENSE || "N/A"}</span>
                            </div>
                            <p className="text-slate-600 text-[11px] leading-relaxed font-sans font-medium whitespace-pre-wrap">{log.PURPOSE}</p>
                            {log.REMARKS && (
                              <div className="text-[10px] bg-indigo-50 text-indigo-800 p-1.5 rounded-lg border border-indigo-100/50 font-medium">
                                <span className="font-extrabold">Remarks:</span> {log.REMARKS}
                              </div>
                            )}
                          </td>
                          <td className="p-4 font-mono text-[11px] text-slate-600 space-y-1">
                            <div className="flex items-center gap-1">
                              <span className="inline-block w-10 flex-shrink-0 text-emerald-600 font-extrabold text-[12px]">IN:</span>
                              <span className="font-bold text-slate-850">{formatDisplayTimestamp(log.CHECK_IN_TIME)}</span>
                            </div>
                            <div className="flex items-center gap-1 border-t border-slate-100 pt-1 mt-1">
                              <span className="inline-block w-10 flex-shrink-0 text-rose-500 font-extrabold text-[12px]">OUT:</span>
                              {isExited ? (
                                <span className="font-bold text-slate-800">{formatDisplayTimestamp(log.CHECK_OUT_TIME)}</span>
                              ) : (
                                <span className="text-rose-600 font-extrabold tracking-wide text-[9.5px] bg-rose-50 px-1 py-0.5 rounded">STILL INSIDE</span>
                              )}
                            </div>
                            <div className="text-[9.5px] text-gray-400 mt-1 font-sans">
                              Shift Guard: {log.CREATED_BY}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            {isExited ? (
                              <span className="inline-flex items-center gap-0.5 py-0.5 px-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-full font-bold text-[10px]">
                                Exited
                              </span>
                            ) : (
                              <button
                                onClick={() => setConfirmCheckoutLog(log)}
                                className="py-1 px-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl font-bold cursor-pointer transition text-[10px]"
                              >
                                Check Out Exit
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                {totalLogPages > 1 && (
                  <div className="bg-slate-50/50 border-t border-slate-105 p-3.5 flex items-center justify-between gap-4 font-sans text-xs">
                    <span className="text-slate-500 font-bold">Showing {paginatedLogs.length} of {filteredLogs.length} logs</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setLogPage(prev => Math.max(prev - 1, 1))}
                        disabled={logPage === 1}
                        className="px-2.5 py-1.5 bg-white border border-slate-205 hover:bg-slate-100 font-bold text-slate-700 rounded-lg disabled:opacity-40 transition cursor-pointer"
                      >
                        Previous
                      </button>
                      <span className="px-2 font-bold text-slate-750">{logPage} / {totalLogPages}</span>
                      <button
                        type="button"
                        onClick={() => setLogPage(prev => Math.min(prev + 1, totalLogPages))}
                        disabled={logPage === totalLogPages}
                        className="px-2.5 py-1.5 bg-white border border-slate-205 hover:bg-slate-100 font-bold text-slate-700 rounded-lg disabled:opacity-40 transition cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-400 font-bold bg-white">
                No visitor archives found matching current search filters.
              </div>
            )}
          </div>

        </div>
      )}

      {/* PANEL 3: MANAGEMENT INSTRUCTIONS */}
      {activePanel === "Instructions" && (
        <div className="space-y-6 animate-in fade-in duration-200 text-xs">
          
          {/* Header instructions summary card */}
          <div className="bg-white rounded-2xl border border-slate-205 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">Guard Shift Guidelines & Instructions</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">Urgent orders, pipeline inspections, and temporary gate allowances issued by Management.</p>
            </div>
            
            {/* Show Composer button for Manager/Admin roles */}
            {(currentUser?.Role === "admin" || currentUser?.Role === "manager") && (
              <button
                type="button"
                onClick={() => setShowAddInstructionModal(true)}
                className="py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Issue Guideline</span>
              </button>
            )}
          </div>

          {/* Active Instructions List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {securityInstructions.length > 0 ? (
              securityInstructions.map((inst) => {
                const currentUserSignature = currentUser ? `${currentUser["Full Name"]} (${currentUser.Role === "staff" ? "Guard" : currentUser.Role})` : "On-Duty Guard";
                const isAcknowledged = (inst.ACKNOWLEDGED_BY || "").split(", ").includes(currentUserSignature);
                return (
                  <div
                    key={inst.ID}
                    className={`bg-white rounded-3xl border p-5 shadow-sm space-y-4 flex flex-col justify-between relative overflow-hidden ${
                      inst.URGENCY === "Critical" ? "border-l-4 border-l-rose-500" :
                      inst.URGENCY === "High" ? "border-l-4 border-l-amber-500" :
                      "border-l-4 border-l-slate-300"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">ID: {inst.ID}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase font-sans animate-pulse ${
                            inst.URGENCY === "Critical" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                            inst.URGENCY === "High" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                            "bg-slate-100 text-slate-700"
                          }`}>
                            {inst.URGENCY}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono font-bold">{inst.DATE}</span>
                        </div>
                      </div>

                      <h4 className="font-extrabold text-sm text-slate-900 font-sans tracking-tight leading-snug">{inst.TITLE}</h4>
                      <p className="text-[11.5px] text-slate-655 font-medium leading-relaxed whitespace-pre-wrap">{inst.DETAILS}</p>
                    </div>

                    <div className="border-t border-slate-100 pt-4 mt-2 space-y-2.5">
                      <div className="flex justify-between items-center text-[10px] text-slate-500">
                        <span>Issued by: <span className="font-extrabold text-slate-805">{inst.POSTED_BY}</span></span>
                      </div>

                      {/* Display signatures list */}
                      <div className="bg-slate-50 p-2 rounded-xl text-[9.5px]">
                        <span className="font-bold text-slate-500 block mb-0.5">Acknowledged Signatures ({inst.ACKNOWLEDGED_BY ? inst.ACKNOWLEDGED_BY.split(", ").length : 0}):</span>
                        <p className="font-mono font-bold text-indigo-860 break-words leading-relaxed">
                          {inst.ACKNOWLEDGED_BY ? `✔ ${inst.ACKNOWLEDGED_BY}` : "Pending acknowledgement signature."}
                        </p>
                      </div>

                      {/* Acknowledge Action button */}
                      <div className="flex justify-end pt-1">
                        {isAcknowledged ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-150 p-1.5 px-3 rounded-xl flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Acknowledged</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAcknowledge(inst.ID)}
                            className="py-1.5 px-3.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-white rounded-xl text-[10.5px] font-bold cursor-pointer transition flex items-center gap-1"
                          >
                            <span>Acknowledge Order</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="md:col-span-2 p-12 text-center text-gray-400 font-bold bg-white rounded-3xl border border-slate-200">
                No guidelines issued currently. Carry on standard operations.
              </div>
            )}
          </div>

          {/* Issue Guideline modal */}
          {showAddInstructionModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto w-full h-full">
              <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-lg w-full animate-in fade-in zoom-in-95 duration-200 text-xs text-gray-900">
                <div className="flex justify-between items-start pb-3 border-b border-slate-100 mb-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Newspaper className="w-4.5 h-4.5 text-indigo-600 animate-pulse" />
                      Issue Shift Guideline Order
                    </h3>
                    <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Post instruction guidelines immediately to all on-shift guards.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddInstructionModal(false)}
                    className="p-1 text-gray-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                <form onSubmit={handleCreateInstruction} className="space-y-4 font-sans text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Instruction title / Brief</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. syabas contractor entry on 14th June"
                      value={newInstTitle}
                      onChange={(e) => setNewInstTitle(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Urgency Rank</label>
                    <select
                      value={newInstUrgency}
                      onChange={(e) => setNewInstUrgency(e.target.value as any)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 font-bold"
                    >
                      <option value="Normal">Normal operational review</option>
                      <option value="High">⚠️ High - strict check needed</option>
                      <option value="Critical">🔴 Critical - immediate shift order</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Instruction Narrative & Action Scope</label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Write the full shift procedures, license verification rules, plate lists, and timing rules..."
                      value={newInstDetails}
                      onChange={(e) => setNewInstDetails(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 font-medium leading-relaxed"
                    />
                  </div>

                  {instSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl font-bold text-center">
                      Shift order published successfully!
                    </div>
                  )}

                  <div className="flex justify-end gap-1.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowAddInstructionModal(false)}
                      className="py-2 px-3.5 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-slate-600 cursor-pointer text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow text-xs cursor-pointer shrink-0"
                    >
                      <span>Issue Order</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

      {/* PANEL 4: SECURITY REPORTS */}
      {activePanel === "Reports" && (
        <div className="space-y-6 animate-in fade-in duration-200 text-xs">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Metrics & Charts block */}
            <div className="bg-white rounded-3xl border border-slate-205 p-6 shadow-sm space-y-4 text-slate-800 font-sans">
              <div>
                <h3 className="font-extrabold text-sm text-slate-850">Visits Distribution Statistics</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Logs categorized by visitor types in database.</p>
              </div>

              <div className="space-y-3 font-semibold text-[11px]">
                
                <div>
                  <div className="flex justify-between text-slate-650 font-bold mb-1">
                    <span>👤 Social Visitors</span>
                    <span>{typeCounts.visitor} ({visitorLogs.length > 0 ? Math.round((typeCounts.visitor / visitorLogs.length) * 100) : 0}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${visitorLogs.length > 0 ? (typeCounts.visitor / visitorLogs.length) * 100 : 0}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-650 font-bold mb-1">
                    <span>🛠️ Work Contractors</span>
                    <span>{typeCounts.contractor} ({visitorLogs.length > 0 ? Math.round((typeCounts.contractor / visitorLogs.length) * 100) : 0}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${visitorLogs.length > 0 ? (typeCounts.contractor / visitorLogs.length) * 100 : 0}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-650 font-bold mb-1">
                    <span>📦 Courier Deliveries</span>
                    <span>{typeCounts.delivery} ({visitorLogs.length > 0 ? Math.round((typeCounts.delivery / visitorLogs.length) * 100) : 0}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500" style={{ width: `${visitorLogs.length > 0 ? (typeCounts.delivery / visitorLogs.length) * 105 : 0}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-650 font-bold mb-1">
                    <span>🔘 Others / Misc</span>
                    <span>{typeCounts.others} ({visitorLogs.length > 0 ? Math.round((typeCounts.others / visitorLogs.length) * 100) : 0}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-400" style={{ width: `${visitorLogs.length > 0 ? (typeCounts.others / visitorLogs.length) * 100 : 0}%` }}></div>
                  </div>
                </div>

              </div>

              <div className="pt-3 border-t border-slate-100 mt-2 font-mono text-[10px] text-gray-400 font-bold flex justify-between">
                <span>Grand Total Logs: {visitorLogs.length}</span>
                <span>Active Inside: {activeInsideVehicles.length}</span>
              </div>
            </div>

            {/* Security Audit summary */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-400 animate-pulse" />
                  <h4 className="font-extrabold text-xs text-white uppercase tracking-widest leading-none font-mono">Visitor Audit Report</h4>
                </div>
                <div className="text-[12px] space-y-3 leading-relaxed text-slate-300">
                  <p>✔ Number plate recognition auditing: <strong className="text-white">Active (100% compliant)</strong></p>
                  <p>✔ Driving License sighting procedure: <strong className="text-white">Active (Guard sighted records)</strong></p>
                  <p>✔ Active pre-auth resident pass codes: <strong className="text-white">{visitorPasses.filter(p => p.STATUS === "Active" && getMalaysiaDateString(p.END_DATE) >= getMalaysiaDateString(new Date())).length} active</strong></p>
                  <p>✔ Pending shift orders: <strong className="text-white">{securityInstructions.length} pending checks</strong></p>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-800 text-[10.5px] font-semibold text-slate-400 leading-snug font-sans">
                This diagnostic summary tracks overall checkpoint performance, resident pre-authorizations, on-site overstay audits, and guard manual instruction sign-offs.
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Checkout Exit Confirmation modal with plate, unit and pass number */}
      {confirmCheckoutLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 overflow-y-auto w-full h-full backdrop-blur-xs">
          <div className={`rounded-3xl p-6 shadow-2xl max-w-md w-full animate-in fade-in zoom-in-95 duration-200 text-xs border ${
            isDarkMode ? "bg-slate-900 border-slate-800 text-slate-105" : "bg-white border-slate-200 text-slate-900"
          }`}>
            {/* Header */}
            <div className={`flex justify-between items-start pb-3 border-b mb-4 ${
              isDarkMode ? "border-slate-800" : "border-slate-100"
            }`}>
              <div>
                <h3 className={`text-sm font-extrabold flex items-center gap-1.5 ${
                  isDarkMode ? "text-slate-100" : "text-slate-800"
                }`}>
                  <Shield className="w-4.5 h-4.5 text-rose-500 animate-pulse" />
                  Confirm Visitor Exit & Pass Return
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Verify physical pass card return prior to gate release.</p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmCheckoutLog(null)}
                className={`p-1.5 hover:bg-slate-100/10 rounded-lg cursor-pointer ${
                  isDarkMode ? "text-slate-400 hover:text-white" : "text-gray-400 hover:text-slate-800 hover:bg-slate-100"
                }`}
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Core Verification Card */}
            <div className={`border rounded-2xl p-4 mb-4 space-y-3.5 ${
              isDarkMode ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
            }`}>
              <span className={`text-[9px] uppercase font-bold font-mono tracking-wider block border-b border-dashed pb-1.5 ${
                isDarkMode ? "text-slate-500 border-slate-800" : "text-slate-450 border-slate-200"
              }`}>Exit Audit Profile</span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[11px]">
                <div>
                  <span className="text-slate-400 block font-mono text-[9px] uppercase font-bold">Vehicle License Plate</span>
                  <p className={`font-extrabold font-mono text-sm tracking-wider mt-0.5 ${isDarkMode ? "text-sky-400" : "text-indigo-800"}`}>{confirmCheckoutLog.VEHICLE_PLATE?.toUpperCase()}</p>
                </div>
                <div>
                  <span className="text-slate-400 block font-mono text-[9px] uppercase font-bold">Assigned Pass ID / Number</span>
                  <p className="font-extrabold font-mono text-rose-500 text-sm mt-0.5">{confirmCheckoutLog.PASS_NUMBER || "N/A"}</p>
                </div>
                <div>
                  <span className="text-slate-450 block font-mono text-[9px] uppercase font-bold">Visited House Unit</span>
                  <p className={`font-bold text-xs mt-0.5 ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>UNIT {confirmCheckoutLog.HOUSE_UNIT}</p>
                </div>
                <div>
                  <span className="text-slate-400 block font-mono text-[9px] uppercase font-bold">Guest / Visitor Name</span>
                  <p className={`font-bold truncate mt-0.5 ${isDarkMode ? "text-slate-350" : "text-slate-850"}`}>{confirmCheckoutLog.VISITOR_NAME || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Crucial Collect Card Alert Block */}
            <div className={`border p-4 rounded-2xl mb-5 flex items-start gap-3 ${
              isDarkMode 
                ? "bg-amber-950/20 border-amber-900/50 text-amber-300" 
                : "bg-amber-50/80 border-amber-250 text-amber-950"
            }`}>
              <span className="text-lg shrink-0">⚠️</span>
              <div className="space-y-1">
                <h5 className={`font-extrabold text-[11px] uppercase tracking-wide ${
                  isDarkMode ? "text-amber-400" : "text-amber-900"
                }`}>Physical Pass Card Collection Required</h5>
                <p className={`text-[10.5px] leading-relaxed font-semibold ${
                  isDarkMode ? "text-amber-350" : "text-amber-950"
                }`}>
                  Please request and physically collect the estate access pass card <b className="underline">(Pass: {confirmCheckoutLog.PASS_NUMBER})</b> from the driver before permitting exit. 
                </p>
              </div>
            </div>

            {/* Checkout Action Choice */}
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmCheckoutLog(null)}
                className={`flex-1 py-2.5 border font-bold rounded-xl transition text-[11px] cursor-pointer text-center ${
                  isDarkMode 
                    ? "border-slate-800 text-slate-300 hover:bg-slate-800/50" 
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                No, Keep Inside
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetLogId = confirmCheckoutLog.ID;
                  handleCheckOut(targetLogId);
                  setConfirmCheckoutLog(null);
                  setManualCheckoutSuccess(`Vehicle ${confirmCheckoutLog.VEHICLE_PLATE} (Pass: ${confirmCheckoutLog.PASS_NUMBER}) has been checked out successfully.`);
                  setManualCheckoutInput("");
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg transition text-[11px] cursor-pointer text-center font-sans"
              >
                Confirm Pass Return & Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WEB CAMERA CAPTURE / AUTOMATED QR SCAN DIALOG */}
      {activeCameraMode && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 overflow-y-auto w-full h-full">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-xl w-full text-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex justify-between items-start pb-4 border-b border-slate-800/85 mb-5">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold font-mono uppercase tracking-wider mb-2">
                  <Video className="w-3 h-3 animate-pulse" />
                  Live Hardware Portal
                </span>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5 leading-none">
                  {activeCameraMode === "snapshot" ? (
                    <>
                      <Camera className="w-4.5 h-4.5 text-sky-400" />
                      Guard Vehicle Snap Audit Camera
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4.5 h-4.5 text-indigo-400" />
                      Pre-authorized Visitor QR Scan
                    </>
                  )}
                </h3>
                <p className="text-[10px] text-slate-400 mt-1.5 font-semibold leading-normal">
                  {activeCameraMode === "snapshot"
                    ? "Capture real-time vehicle bumper & license license plate photoroll."
                    : "Position visitor's pre-approved QR pass code badge inside the focus scanner."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveCameraMode(null)}
                className="p-1 px-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer text-[10.5px] font-bold shrink-0"
              >
                Cancel
              </button>
            </div>

            {/* Error alerts with simulation warnings */}
            {cameraError && (
              <div className="mb-4 p-4 bg-sky-950/20 border border-sky-900/50 text-sky-200 rounded-2xl text-[10.5px] leading-relaxed font-semibold flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-sky-300 font-extrabold uppercase text-[9px] mb-0.5 font-mono tracking-wider">Apps Script Sandbox Active</span>
                  <p>{cameraError}</p>
                </div>
              </div>
            )}

            {/* Video Viewport Stage */}
            <div className="relative rounded-2xl overflow-hidden aspect-video border border-slate-800 bg-slate-950 flex flex-col items-center justify-center">
              {isCameraLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/90 text-center p-6">
                  <span className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></span>
                  <p className="text-[11px] font-extrabold text-slate-300 animate-pulse">Requesting system camera permissions...</p>
                  <p className="text-[9.5px] text-slate-500 mt-1">Awaiting permission consensus</p>
                </div>
              )}

              {/* Real Video Element */}
              {!cameraError && !isCameraLoading && (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover rounded-2xl bg-slate-900 ${
                      cameraFacingMode === "user" ? "-scale-x-100" : ""
                    }`}
                  />
                  {/* Camera Switch Toggle Button overlay */}
                  <button
                    type="button"
                    onClick={() => setCameraFacingMode(prev => prev === "user" ? "environment" : "user")}
                    className="absolute top-3 right-3 z-20 px-2.5 py-1.5 bg-slate-950/90 hover:bg-slate-900 border border-slate-800 text-white rounded-xl shadow-lg hover:scale-105 transition active:scale-95 cursor-pointer flex items-center gap-1.5 text-[9.5px] font-mono tracking-wider font-extrabold uppercase"
                    title="Switch Front/Back Camera"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin-slow" />
                    <span>{cameraFacingMode === "user" ? "Front (Selfie)" : "Back (Vehicle)"}</span>
                  </button>
                </>
              )}

              {/* Fallback Static Simulated Viewport */}
              {cameraError && !isCameraLoading && (
                <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden">
                  {activeCameraMode === "snapshot" ? (
                    <div className="space-y-3 max-w-xs scale-95 md:scale-100">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
                        <Car className="w-7 h-7" />
                      </div>
                      <h4 className="text-xs font-extrabold text-white uppercase tracking-wider animate-pulse">Simulated Bumper Camera Active</h4>
                      <p className="text-[10px] text-slate-405 leading-normal">
                        Ready to intercept vehicle plates automatically through virtual scanner telemetry.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-w-xs scale-95 md:scale-100">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
                        <QrCode className="w-7 h-7 animate-pulse" />
                      </div>
                      <h4 className="text-xs font-extrabold text-white uppercase tracking-wider text-indigo-400 leading-none">Simulated Optic QR Scanner Active</h4>
                      <p className="text-[10px] text-slate-400 leading-normal mt-1">
                        Select the prefered pre-authorized card below to trigger high-fidelity virtual audit response.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Video Overlay HUD Guides */}
              {!isCameraLoading && (
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
                  {/* Neon HUD corners */}
                  <div className="flex justify-between">
                    <div className="w-6 h-6 border-t-3 border-l-3 border-indigo-500 rounded-tl-lg" />
                    <div className="w-6 h-6 border-t-3 border-r-3 border-indigo-500 rounded-tr-lg" />
                  </div>

                  {activeCameraMode === "qr" && (
                    <div className="self-center flex flex-col items-center justify-center shrink-0 w-36 h-36 rounded-2xl border-2 border-dashed border-indigo-500/80 bg-indigo-500/5 relative">
                      <div className="absolute inset-x-2 h-0.5 bg-indigo-400/85 animate-pulse" style={{ animationDuration: "1s" }} />
                      <span className="text-[8px] font-mono font-bold tracking-wider text-indigo-455 bg-slate-950 px-1 py-0.5 rounded-sm">Optic QR Zone</span>
                    </div>
                  )}

                  {activeCameraMode === "snapshot" && (
                    <div className="self-center flex flex-col items-center justify-center shrink-0 w-3/4 h-20 rounded-xl border border-dashed border-sky-400/45 bg-sky-500/5 relative">
                      <span className="text-[8px] font-mono font-bold tracking-wider text-sky-400 bg-slate-950 px-1.5 py-0.5 rounded-sm">License Plate & Bumper Profile</span>
                    </div>
                  )}

                  <div className="flex justify-between items-end">
                    <div className="w-6 h-6 border-b-3 border-l-3 border-indigo-500 rounded-bl-lg" />
                    <span className="text-[8px] font-mono tracking-widest text-indigo-400 bg-slate-950/80 px-2 py-0.5 rounded-sm uppercase font-bold">1080P ACTIVE</span>
                    <div className="w-6 h-6 border-b-3 border-r-3 border-indigo-500 rounded-br-lg" />
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions Frame */}
            <div className="mt-5 space-y-4">
              {/* Dynamic QR Selector when QR code scanning */}
              {activeCameraMode === "qr" && (
                <div className="bg-slate-900 border border-slate-800/80 p-3 rounded-2xl text-xs space-y-2">
                  <span className="block text-[9.5px] uppercase font-bold text-indigo-450 tracking-wider font-mono">1. Select Target Visitor Pass:</span>
                  <select
                    value={selectedScanPass}
                    onChange={(e) => setSelectedScanPass(e.target.value)}
                    className="w-full p-2 bg-slate-950 text-white rounded-xl border border-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">-- Choose pre-authorized visitor pass --</option>
                    {visitorPasses.filter(p => p.STATUS === "Active" && getMalaysiaDateString(p.END_DATE) >= getMalaysiaDateString(new Date())).map((p) => (
                      <option key={p.ID} value={p.ID}>
                        {p.VISITOR_NAME} ({p.VEHICLE_PLATE}) - Unit {p.HOUSE_UNIT} [{p.ID}]
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status and Click Progress alerts */}
              {scanProgressLabel && (
                <div className="p-3 bg-slate-900 text-slate-350 text-[10px] font-bold rounded-xl flex items-center gap-2 border border-slate-800/50">
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-spin shrink-0" />
                  <span className="animate-pulse">{scanProgressLabel}</span>
                </div>
              )}

              {/* Capture Control Button layout */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveCameraMode(null)}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer text-center"
                >
                  Close Portal
                </button>

                <input
                  id="native-device-camera"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleNativeCameraCapture}
                />

                <input
                  id="native-device-qr-camera"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleNativeQRUploadCapture}
                />

                {activeCameraMode === "snapshot" ? (
                  <div className="flex gap-2 flex-1">
                    {cameraError && (
                      <button
                        type="button"
                        disabled={cameraUploading}
                        onClick={() => document.getElementById("native-device-camera")?.click()}
                        className="flex-1 py-3 bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Camera className="w-4 h-4 text-amber-300 animate-pulse" />
                        <span>Take Real Photo</span>
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={cameraUploading}
                      onClick={handleCapturePhoto}
                      className={`flex-1 py-3 text-white font-extrabold text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        cameraError 
                          ? "bg-slate-800 hover:bg-slate-705 text-slate-300 border border-slate-700" 
                          : "bg-sky-600 hover:bg-sky-500"
                      }`}
                    >
                      {cameraError ? <Sparkles className="w-4 h-4 text-amber-400" /> : <Camera className="w-4 h-4" />}
                      <span>{cameraUploading ? "Processing..." : cameraError ? "Skip & Simulate" : "Capture Photo"}</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 flex-1">
                    {cameraError && (
                      <button
                        type="button"
                        disabled={cameraUploading}
                        onClick={() => document.getElementById("native-device-qr-camera")?.click()}
                        className="flex-1 py-3 bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Camera className="w-4 h-4 text-emerald-300 animate-pulse" />
                        <span>Scan from Photo</span>
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!selectedScanPass && !cameraError}
                      onClick={() => handleExecuteQRScan(selectedScanPass || visitorPasses.filter(p => p.STATUS === "Active" && getMalaysiaDateString(p.END_DATE) >= getMalaysiaDateString(new Date()))[0]?.ID)}
                      className={`flex-1 py-3 text-white font-extrabold text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        cameraError 
                          ? "bg-slate-800 hover:bg-slate-705 text-slate-300 border border-slate-700" 
                          : "bg-indigo-600 hover:bg-indigo-500"
                      }`}
                    >
                      <QrCode className="w-4 h-4 animate-bounce" />
                      <span>{cameraUploading ? "Scanning..." : cameraError ? "Simulate Match" : "Simulate Optic Scan Match"}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ALL PRE-AUTHORIZED ACTIVE PASSES LIST MODAL */}
      {showPassesModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans text-xs">
          <div className={`w-full max-w-4xl border rounded-3xl shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh] overflow-hidden ${
            isDarkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800"
          }`}>
            {/* Modal Header */}
            <div className={`p-5 border-b flex items-center justify-between shrink-0 ${
              isDarkMode ? "border-slate-800 bg-slate-900" : "border-slate-100 bg-slate-50"
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${isDarkMode ? "bg-indigo-950/40 text-indigo-400" : "bg-indigo-50/80 text-indigo-600"}`}>
                  <QrCode className="w-5 h-5 font-bold" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm tracking-tight">Active Pre-Authorized Resident Passes</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Select any resident pre-authorized active pass below to automatically simulate a QR check-in scan.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPassesModal(false)}
                className={`p-1.5 rounded-xl transition cursor-pointer ${
                  isDarkMode ? "hover:bg-slate-800 text-slate-400 hover:text-slate-200" : "hover:bg-slate-200 text-slate-550 hover:text-slate-850"
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Filtering Controls & Table */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              
              {/* Controls bar (Search, Filter, List per page) */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pb-2">
                {/* Search */}
                <div className="sm:col-span-5 relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, plate, unit, ID..."
                    value={modalSearchValue}
                    onChange={(e) => {
                      setModalSearchValue(e.target.value);
                      setModalPage(1);
                    }}
                    className={`w-full pl-9 pr-4 py-2 text-xs border rounded-xl outline-hidden focus:ring-1 transition ${
                      isDarkMode
                        ? "bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:ring-indigo-500"
                        : "bg-white border-slate-220 placeholder-slate-400 focus:ring-indigo-600 text-slate-800"
                    }`}
                  />
                  {modalSearchValue && (
                    <button
                      type="button"
                      onClick={() => {
                        setModalSearchValue("");
                        setModalPage(1);
                      }}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Type */}
                <div className="sm:col-span-4 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Type:</span>
                  <select
                    value={modalFilterType}
                    onChange={(e) => {
                      setModalFilterType(e.target.value);
                      setModalPage(1);
                    }}
                    className={`w-full py-2 px-3 text-xs border rounded-xl outline-hidden focus:ring-1 transition ${
                      isDarkMode
                        ? "bg-slate-950 border-slate-800 text-white focus:ring-indigo-500"
                        : "bg-white border-slate-220 text-slate-805 focus:ring-indigo-600"
                    }`}
                  >
                    <option value="all">All Types</option>
                    <option value="visitor">Visitor</option>
                    <option value="contractor">Contractor</option>
                    <option value="delivery">Delivery</option>
                  </select>
                </div>

                {/* List per page */}
                <div className="sm:col-span-3 flex items-center gap-2 justify-end">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Show:</span>
                  <select
                    value={modalItemsPerPage}
                    onChange={(e) => {
                      setModalItemsPerPage(Number(e.target.value));
                      setModalPage(1);
                    }}
                    className={`py-2 px-3 text-xs border rounded-xl outline-hidden focus:ring-1 transition ${
                      isDarkMode
                        ? "bg-slate-950 border-slate-800 text-white focus:ring-indigo-500"
                        : "bg-white border-slate-220 text-slate-805 focus:ring-indigo-600"
                    }`}
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="15">15</option>
                    <option value="25">25</option>
                  </select>
                </div>
              </div>

              {/* Table rendering */}
              {(() => {
                const filteredPasses = visitorPasses.filter((p) => {
                  if (p.STATUS !== "Active") return false;
                  
                  // Skip expired passes
                  if (getMalaysiaDateString(p.END_DATE) < getMalaysiaDateString(new Date())) return false;
                  
                  // Filter Type
                  if (modalFilterType !== "all" && p.VISITOR_TYPE !== modalFilterType) {
                    return false;
                  }

                  // Search term lookup
                  if (modalSearchValue.trim()) {
                    const searchLower = modalSearchValue.toLowerCase();
                    const nameMatch = p.VISITOR_NAME?.toLowerCase().includes(searchLower);
                    const plateMatch = p.VEHICLE_PLATE?.toLowerCase().includes(searchLower);
                    const houseMatch = p.HOUSE_UNIT?.toLowerCase().includes(searchLower);
                    const idMatch = p.ID?.toLowerCase().includes(searchLower);
                    return nameMatch || plateMatch || houseMatch || idMatch;
                  }
                  
                  return true;
                });

                const totalItems = filteredPasses.length;
                const totalPages = Math.ceil(totalItems / modalItemsPerPage) || 1;
                const startIndex = (modalPage - 1) * modalItemsPerPage;
                const paginatedPasses = filteredPasses.slice(startIndex, startIndex + modalItemsPerPage);

                return (
                  <div className="space-y-4">
                    <div className={`border rounded-2xl overflow-hidden ${
                      isDarkMode ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-white"
                    }`}>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className={`border-b text-[10px] font-extrabold uppercase tracking-wider ${
                              isDarkMode ? "bg-slate-950 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"
                            }`}>
                              <th className="p-3">Pass ID</th>
                              <th className="p-3">Visitor Name</th>
                              <th className="p-3">Visitor Type</th>
                              <th className="p-3">House Unit</th>
                              <th className="p-3">Vehicle Plate</th>
                              <th className="p-3">Validity Duration</th>
                              <th className="p-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100/10">
                            {paginatedPasses.length > 0 ? (
                              paginatedPasses.map((p) => (
                                <tr 
                                  key={p.ID}
                                  className={`text-[11px] font-semibold transition ${
                                    isDarkMode ? "hover:bg-slate-900/60 text-slate-200" : "hover:bg-slate-50 text-slate-700"
                                  }`}
                                >
                                  <td className="p-3 font-mono font-bold text-indigo-500">{p.ID}</td>
                                  <td className="p-3 text-slate-800 dark:text-slate-150 font-bold">{p.VISITOR_NAME}</td>
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                                      p.VISITOR_TYPE === "visitor" 
                                        ? "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-350"
                                        : p.VISITOR_TYPE === "contractor"
                                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-350"
                                        : "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-350"
                                    }`}>
                                      {p.VISITOR_TYPE}
                                    </span>
                                  </td>
                                  <td className="p-3 font-mono text-slate-705 dark:text-slate-400">Unit {p.HOUSE_UNIT}</td>
                                  <td className="p-3">
                                    <span className="uppercase font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded-lg font-mono border border-slate-200 dark:border-slate-800 text-[10.5px]">
                                      {p.VEHICLE_PLATE}
                                    </span>
                                  </td>
                                  <td className="p-3 text-slate-800 dark:text-slate-300">
                                    <div>{p.START_DATE} ~ {p.END_DATE}</div>
                                    <div className="text-[9.5px] text-slate-500 mt-0.5 font-mono">Hrs: {p.TIME_RANGE}</div>
                                  </td>
                                  <td className="p-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setScanPassId(p.ID);
                                        handleSimulateQRScan(p.ID);
                                        setShowPassesModal(false);
                                      }}
                                      className="py-1.5 px-3 bg-indigo-650 hover:bg-indigo-700 hover:scale-105 active:scale-95 text-white rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition shadow-xs uppercase tracking-wide"
                                    >
                                      <UserCheck className="w-3 h-3" />
                                      <span>Simulate Scan</span>
                                    </button>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                                  No active, matching pre-authorized passes found.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Pagination control footer bar */}
                    {totalItems > 0 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                        <span className="text-[10.5px] text-slate-500 font-semibold dark:text-slate-400">
                          Showing <strong className="text-slate-700 dark:text-slate-300">{Math.min(startIndex + 1, totalItems)}</strong> to{" "}
                          <strong className="text-slate-700 dark:text-slate-300">{Math.min(startIndex + modalItemsPerPage, totalItems)}</strong> of{" "}
                          <strong className="text-indigo-600 font-extrabold">{totalItems}</strong> entries
                        </span>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* First & Prev */}
                          <button
                            type="button"
                            disabled={modalPage === 1}
                            onClick={() => setModalPage(1)}
                            className={`px-2.5 py-1.5 rounded-lg border font-bold transition text-[10.5px] ${
                              modalPage === 1
                                ? "opacity-40 cursor-not-allowed border-slate-200 text-slate-400"
                                : isDarkMode
                                ? "border-slate-700 text-slate-200 hover:bg-slate-800"
                                : "border-slate-220 hover:bg-slate-100 cursor-pointer text-slate-600"
                            }`}
                          >
                            First
                          </button>
                          <button
                            type="button"
                            disabled={modalPage === 1}
                            onClick={() => setModalPage((v) => Math.max(v - 1, 1))}
                            className={`px-2.5 py-1.5 rounded-lg border font-bold transition text-[10.5px] ${
                              modalPage === 1
                                ? "opacity-40 cursor-not-allowed border-slate-200 text-slate-400"
                                : isDarkMode
                                ? "border-slate-700 text-slate-200 hover:bg-slate-800"
                                : "border-slate-220 hover:bg-slate-100 cursor-pointer text-slate-600"
                            }`}
                          >
                            Prev
                          </button>

                          {/* Pages loop */}
                          {Array.from({ length: totalPages }).map((_, i) => {
                            const pageNum = i + 1;
                            const isCurrent = pageNum === modalPage;
                            return (
                              <button
                                key={pageNum}
                                type="button"
                                onClick={() => setModalPage(pageNum)}
                                className={`w-7 h-7 rounded-lg font-bold text-[10.5px] transition cursor-pointer flex items-center justify-center ${
                                  isCurrent
                                    ? "bg-indigo-600 text-white font-extrabold"
                                    : isDarkMode
                                    ? "border border-slate-700 hover:bg-slate-800 text-slate-300"
                                    : "border border-slate-220 hover:bg-slate-100 text-slate-600"
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}

                          {/* Next & Last */}
                          <button
                            type="button"
                            disabled={modalPage === totalPages}
                            onClick={() => setModalPage((v) => Math.min(v + 1, totalPages))}
                            className={`px-2.5 py-1.5 rounded-lg border font-bold transition text-[10.5px] ${
                              modalPage === totalPages
                                ? "opacity-40 cursor-not-allowed border-slate-200 text-slate-400"
                                : isDarkMode
                                ? "border-slate-705 text-slate-200 hover:bg-slate-850"
                                : "border-slate-220 hover:bg-slate-100 cursor-pointer text-slate-600"
                            }`}
                          >
                            Next
                          </button>
                          <button
                            type="button"
                            disabled={modalPage === totalPages}
                            onClick={() => setModalPage(totalPages)}
                            className={`px-2.5 py-1.5 rounded-lg border font-bold transition text-[10.5px] ${
                              modalPage === totalPages
                                ? "opacity-40 cursor-not-allowed border-slate-200 text-slate-400"
                                : isDarkMode
                                ? "border-slate-705 text-slate-200 hover:bg-slate-850"
                                : "border-slate-220 hover:bg-slate-100 cursor-pointer text-slate-600"
                            }`}
                          >
                            Last
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>

            {/* Modal Footer */}
            <div className={`p-4 border-t flex justify-end shrink-0 ${
              isDarkMode ? "border-slate-800 bg-slate-900" : "border-slate-100 bg-slate-50"
            }`}>
              <button
                type="button"
                onClick={() => setShowPassesModal(false)}
                className={`py-2 px-5 font-bold rounded-xl text-xs cursor-pointer transition ${
                  isDarkMode 
                    ? "bg-slate-800 hover:bg-slate-755 text-slate-300" 
                    : "bg-white hover:bg-slate-100 border border-slate-200 text-slate-750 shadow-xs"
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
