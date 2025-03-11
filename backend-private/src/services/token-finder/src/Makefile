# Makefile for building the token_finder program

CXX      = g++
CXXFLAGS = -std=c++17 -Wall -Wextra
LIBS     = -lpqxx -lpq -lcurl

TARGET   = token_finder
SOURCES  = token_finder.cpp keccak.cpp
OBJS     = $(SOURCES:.cpp=.o)

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CXX) $(CXXFLAGS) -o $(TARGET) $(OBJS) $(LIBS)

%.o: %.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@

clean:
	rm -f $(OBJS) $(TARGET)
