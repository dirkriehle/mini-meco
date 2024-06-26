import "./Settings.css";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import Add from "./../../assets/Add.png";
import Edit from "./../../assets/Edit.png";
import Delete from "./../../assets/Line 20.png";
import ReturnButton from "../Components/return";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import Button from "react-bootstrap/esm/Button";

const Settings: React.FC = () => {
  const navigate = useNavigate();

  const handleNavigation = () => {
    navigate("/settings");
  };

  const [role, setRole] = useState("");
  const [message, setMessage] = useState("");

  const [projectGroups, setProjectGroups] = useState<string[]>([]);
  const [projects, setProjects] = useState<
    { id: number; projectName: string; projectGroupName: string }[]
  >([]);
  const [selectedProjectGroup, setSelectedProjectGroup] = useState<string>("");

  const [user, setUser] = useState<{ name: string; email: string } | null>(
    null
  );

  useEffect(() => {
    const fetchUserData = () => {
      const userName = localStorage.getItem("username");
      const userEmail = localStorage.getItem("email");
      if (userName && userEmail) {
        setUser({ name: userName, email: userEmail });
      } else {
        console.warn("User data not found in localStorage");
      }
    };

    fetchUserData();

    const fetchProjectGroups = async () => {
      try {
        const response = await fetch("http://localhost:3000/project-groups");
        const data = await response.json();
        setProjectGroups(data.map((item: any) => item.projectGroupName));
        console.log("Fetched project groups:", data);
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error(error.message);
        }
      }
    };

    fetchProjectGroups();
  }, []);

  useEffect(() => {
    const fetchProjects = async () => {
      if (selectedProjectGroup) {
        try {
          const response = await fetch(
            `http://localhost:3000/projects?projectGroupName=${selectedProjectGroup}`
          );
          const data = await response.json();
          const mappedProjects = data.map((item: any) => ({
            id: item.id,
            projectName: item.projectName,
            projectGroupName: item.projectGroupName || selectedProjectGroup,
          }));
          setProjects(mappedProjects);
        } catch (error: unknown) {
          if (error instanceof Error) {
            console.error(error.message);
          }
        }
      } else {
        setProjects([]);
      }
    };

    fetchProjects();
  }, [selectedProjectGroup]);

  const filteredProjects = projects.filter(
    (project) => project.projectGroupName === selectedProjectGroup
  );

  const handleJoin = async (projectName: string) => {
    if (!user) {
      setMessage("User data not available. Please log in again.");
      return;
    }

    const body = {
      projectName,
      memberName: user.name,
      memberRole: role,
      memberEmail: user.email,
    };

    try {
      const response = await fetch(
        "http://localhost:3000/settings/joinProject",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Something went wrong");
      }

      setMessage(data.message || "Successfully joined the project!");
      if (data.message.includes("successfully")) {
        window.location.reload(); 
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(error.message);
        setMessage(error.message);
      }
    }
  };

  const handleLeave = async (projectName: string) => {
    if (!user) {
      setMessage("User data not available. Please log in again.");
      return;
    }

    const body = {
      projectName,
      memberEmail: user.email,
    };

    try {
      const response = await fetch(
        "http://localhost:3000/settings/leaveProject",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Something went wrong");
      }

      setMessage(data.message || "Successfully left the project!");
      if (data.message.includes("successfully")) {
        window.location.reload(); 
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(error.message);
        setMessage(error.message);
      }
    }
  };

  return (
    <div onClick={handleNavigation}>
      <ReturnButton />
      <div className="DashboardContainer">
        <h1>Settings</h1>
      </div>
      <div className="BigContainer">
        <div className="AccountInfoContainer">
          <div className="AccountTitle">
            <h3>Account Info</h3>
          </div>
          <div className="PersonalDataContainer">
            <div className="PersonalData">
              <div className="Email">
                Email: {user?.email || "Email not available"}
              </div>
              <img className="Edit2" src={Edit} />
            </div>
            <div className="PersonalData">
              <div className="Password">Password: ********</div>
              <img className="Edit2" src={Edit} />
            </div>
          </div>
        </div>
        <div className="ProjectContainer">
          <div className="ProjectTitle">
            <h3>Project Lists</h3>
          </div>
          <div className="SelectWrapper">
            <Select
              onValueChange={(value) => {
                setSelectedProjectGroup(value);
              }}
            >
              <SelectTrigger className="SelectTrigger">
                <SelectValue placeholder="Select a project group" />
              </SelectTrigger>
              <SelectContent className="SelectContent">
                {projectGroups.map((group, index) => (
                  <SelectItem key={index} value={group}>
                    {group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            {filteredProjects.map((project) => (
              <div className="ProjectItem3" key={project.id}>
                <div className="ProjectName">{project.projectName}</div>
                <div className="Imgs">

                <Dialog>
                  <DialogTrigger className="DialogTrigger">
                    <img className="Add" src={Add} alt="Add" />
                  </DialogTrigger>
                  <DialogContent className="DialogContent">
                    <DialogHeader>
                      <DialogTitle className="DialogTitle">
                        Join Project
                      </DialogTitle>
                    </DialogHeader>
                    <div className="RoleInput">
                      <div className="Role">Role: </div>
                      <input
                        type="text"
                        className="ProjAdmin-inputBox"
                        placeholder="Enter your role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        className="create"
                        variant="primary"
                        onClick={() => handleJoin(project.projectName)}
                      >
                        Join
                      </Button>
                    </DialogFooter>
                    {message && <div className="Message">{message}</div>}
                  </DialogContent>
                </Dialog>
                <Dialog>
                  <DialogTrigger className="DialogTrigger">
                    <img className="Delete" src={Delete} alt="Delete" />
                  </DialogTrigger>
                  <DialogContent className="DialogContent">
                    <DialogHeader>
                      <DialogTitle className="DialogTitle">
                        Leave Project
                      </DialogTitle>
                    </DialogHeader>
                    <div className="LeaveText">
                      Are you sure you want to leave {project.projectName} ?{" "}
                    </div>
                    <DialogFooter>
                      <Button
                        className="create"
                        variant="primary"
                        onClick={() => handleLeave(project.projectName)}
                      >
                        Confirm
                      </Button>
                    </DialogFooter>
                    {message && <div className="Message">{message}</div>}
                  </DialogContent>
                </Dialog>
                </div>
                <hr className="ProjectDivider" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
