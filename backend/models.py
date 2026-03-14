#this is a blueprint file for SQL ALCHEMY

from sqlalchemy import Column,String,Integer,ForeignKey,Boolean
from database import Base

class User(Base):
    __tablename__ = "UserInfo"
    email = Column(String(100), primary_key=True, nullable=False) 
    github_pat = Column(String(255), nullable=True)  
    password = Column(String(100), nullable=False)   
    experience_lvl = Column(String(20), nullable=False) 

class Organization(Base):
    __tablename__ = "Organizations"
    id = Column(Integer, primary_key=True,index = True)
    github_link = Column(String(100), unique = True,nullable = False)
    web_url = Column(String(500))
    tech_stack = Column(String(225),nullable=False)
    name = Column(String,nullable=False, unique=True)

class Contributions(Base):
    __tablename__ = "Contributions"
    id = Column(Integer,primary_key=True,index=True)
    repo_name = Column(String,nullable=False)
    issue_title = Column(String,nullable=False)
    language = Column(String)
    issue_number = Column(Integer,nullable=False)
    user_email = Column(String, ForeignKey("UserInfo.email"))
    status = Column(String)
    pr_sent = Column(Boolean, default=False)

class RepoAnalysis(Base):
    __tablename__ = "RepoAnalysis"
    id = Column(Integer, primary_key=True, index=True)
    repo_name = Column(String, unique=True, nullable=False)
    system_prompt_context = Column(String, nullable=False)

class ContributionProgress(Base):
    __tablename__ = "ContributionProgress"
    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, ForeignKey("UserInfo.email"))
    repo_name = Column(String, nullable=False)
    issue_number = Column(Integer, nullable=False)
    issue_summary = Column(String)
    final_approach = Column(String)
    git_commands = Column(String)
    test_results = Column(String)
    chat_history = Column(String)


