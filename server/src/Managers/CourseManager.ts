import { Database } from "sqlite";
import { ObjectHandler } from "../ObjectHandler";
import { DatabaseSerializableFactory } from "../Serializer/DatabaseSerializableFactory";
import { Course } from "../Models/Course";
import { CourseProject } from "../Models/CourseProject";
import { DatabaseWriter } from "../Serializer/DatabaseWriter";
import { MethodFailedException } from "../Exceptions/MethodFailedException";
import { Semester } from "../Models/Semester";
import { IllegalArgumentException } from "../Exceptions/IllegalArgumentException";
import { ProjectManager } from "./ProjectManager";
import { CourseSchedule, SubmissionDate } from "../Models/CourseSchedule";
import { IManager } from "./IManager";

/**
 * Manages Course operations and writes them persistent.
 * This implementation handles a database schema where courseName/projectName is defined as UNIQUE.
 */
export class CourseManager implements IManager {
  protected db: Database;
  protected oh: ObjectHandler;
  private factory: DatabaseSerializableFactory;
  private pm: ProjectManager;

  constructor(db: Database, oh: ObjectHandler) {
    this.db = db;
    this.oh = oh;
    this.factory = new DatabaseSerializableFactory(db);
    this.pm = new ProjectManager(db, oh);
  }

  /**
   * Creates a new course if it does not already exist.
   * If a course with the same name exists, ensures it belongs to the same semester.
   * @returns Newly created or existing course
   */
  async createCourse(courseName: string, semester: string): Promise<Course> {
    let validSemester = Semester.create(semester);
    let course: Course | null = null;

    try {
      const existingRow = await this.db.get(
        "SELECT * FROM courses WHERE courses.courseName = ?",
        [courseName]
      );

      if (existingRow) {
        course = await this.oh.getCourse(existingRow.id, this.db);
        if (!course) {
          throw new MethodFailedException(
            "Existing course could not be loaded."
          );
        }

        // If Semester is set and does not match semester
        if (
          course.getSemester() &&
          course.getSemester() !== validSemester.toString()
        ) {
          throw new IllegalArgumentException(
            `Course with name "${courseName}" already exists with semester "${course.getSemester()}". ` +
              `Cannot create another course with the same name for semester "${validSemester.toString()}".`
          );
        }
        course.setName(semester);

        const writer = new DatabaseWriter(this.db);
        writer.writeRoot(course);

        return course;
      } else {
        // Create new Course-Entity
        course = (await this.factory.create("Course")) as Course;
        if (!course) {
          throw new MethodFailedException("Course creation failed.");
        }

        course.setName(courseName);
        course.setSemester(semester);

        // Write Root-Object Course
        const writer = new DatabaseWriter(this.db);
        writer.writeRoot(course);

        return course;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Retrieves a course by ID and its associated projects.
   * @param id Unique course ID
   * @returns Course object with its projects
   */
  async readCourse(id: number): Promise<Course> {
    const c = await this.oh.getCourse(id, this.db);
    if (!c) throw new IllegalArgumentException("CourseID not found.");

    const projects = await this.getProjectsForCourse(c);
    for (const p of projects) {
      if (p !== null) {
        c.addProject(p);
      }
    }
    return c;
  }

  /**
   * Fetches all courses from the database.
   * @returns Array of all courses
   */
  async getAllCourse(): Promise<Course[]> {
    const courseRows = await this.db.all("SELECT * FROM courses");
    let allCourse: Course[] = [];
    for (const row of courseRows) {
      const course = await this.oh.getCourse(row.id, this.db);
      if (course !== null) {
        allCourse.push(course);
      }
    }
    return allCourse;
  }

  /**
   * Adds a new project to an existing course.
   * @returns Created project instance
   */
  async addProjectToCourse(
    courseId: string | number,
    projectName: string
  ): Promise<CourseProject> {
    const id = parseInt(courseId as string);
    if (isNaN(id)) {
      throw new IllegalArgumentException("Course ID must be an integer");
    }

    if (!projectName || typeof projectName !== "string") {
      throw new IllegalArgumentException(
        "Project name is required and must be a string"
      );
    }

    try {
      const course = await this.readCourse(id); // return obj to instance
      if (!course) {
        throw new MethodFailedException("Existing course could not be loaded.");
      }

      // Create and add project
      const proj = await this.pm.createProject();
      proj.setName(projectName);
      proj.setCourse(course);
      course.addProject(proj);

      // Write to database
      const writer = new DatabaseWriter(this.db);
      writer.writeRoot(proj);
      writer.writeRoot(course);

      return proj;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Retrieves all projects associated with a given course.
   * @returns Array of projects linked to the course
   */
  async getProjectsForCourse(course: Course): Promise<CourseProject[]> {
    const projectRows = await this.db.all(
      `
            SELECT *
            FROM projects
            WHERE courseId = ?
        `,
      course.getId()
    );
    let projects: CourseProject[] = [];
    for (const row of projectRows) {
      const project = await this.oh.getCourseProject(row.id, this.db);
      if (project !== null) {
        project.setCourse(course);
        projects.push(project);
      }
    }

    return projects;
  }

  /**
   * Updates a project's name and optionally its course association.
   * @param projectId ID of the project to update
   * @param projectName New project name
   * @param courseId Optional new course ID
   * @returns Updated project instance
   */
  async updateProject(
    projectId: number,
    projectName: string,
    courseId?: number
  ): Promise<CourseProject | null> {
    try {
      const project = await this.oh.getCourseProject(projectId, this.db);
      if (!project) {
        return null;
      }

      project.setName(projectName);

      if (courseId !== undefined) {
        const course = await this.readCourse(courseId);
        if (!course) {
          throw new IllegalArgumentException("Course not found");
        }
        project.setCourse(course);
      }

      const writer = new DatabaseWriter(this.db);
      writer.writeRoot(project);

      return project;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Deletes a project from the database.
   * @param projectId ID of the project to delete
   * @returns True if deletion was successful, false if project not found
   */
  async deleteProject(projectId: number): Promise<boolean> {
    try {
      const project = await this.oh.getCourseProject(projectId, this.db);
      if (!project) {
        return false;
      }

      // Delete from database
      await this.db.run("DELETE FROM projects WHERE id = ?", [projectId]);

      // Also delete related user_projects entries
      await this.db.run("DELETE FROM user_projects WHERE projectId = ?", [projectId]);

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Saves or updates a course schedule with submission dates.
   * @param courseId ID of the course
   * @param startDate Schedule start date
   * @param endDate Schedule end date
   * @param submissionDates Array of submission dates
   * @returns Saved schedule instance
   */
  async saveSchedule(
    courseId: number,
    startDate: Date,
    endDate: Date,
    submissionDates: Date[]
  ): Promise<CourseSchedule> {
    try {
      // Check if course exists
      const course = await this.readCourse(courseId);
      if (!course) {
        throw new IllegalArgumentException("Course not found");
      }

      // Check if schedule already exists
      let schedule = await this.oh.getCourseSchedule(courseId, this.db);

      if (!schedule) {
        // Create new schedule
        schedule = await this.factory.create("CourseSchedule") as CourseSchedule;
        if (!schedule) {
          throw new MethodFailedException("Schedule creation failed");
        }
        schedule.setId(courseId); // Use courseId as schedule ID (1:1 relationship)
      }

      schedule.setStartDate(startDate);
      schedule.setEndDate(endDate);

      // Delete existing submission dates
      await this.db.run("DELETE FROM submissions WHERE scheduleId = ?", [courseId]);

      // Create new submission dates
      const submissionDateObjects: SubmissionDate[] = [];
      for (const date of submissionDates) {
        const subDate = await this.factory.create("SubmissionDate") as SubmissionDate;
        if (subDate) {
          subDate.setSubmissionDate(date);
          submissionDateObjects.push(subDate);
        }
      }
      schedule.setSubmissionDates(submissionDateObjects);

      // Write to database
      const writer = new DatabaseWriter(this.db);
      writer.writeRoot(schedule);

      return schedule;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Retrieves a course schedule by course ID.
   * @param courseId ID of the course
   * @returns Schedule instance or null if not found
   */
  async getSchedule(courseId: number): Promise<CourseSchedule | null> {
    try {
      return await this.oh.getCourseSchedule(courseId, this.db);
    } catch {
      return null;
    }
  }
}
